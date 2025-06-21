import { db } from "@/config/db";
import { openai } from "@/config/OpenAiModel";
import { SessionChatTable } from "@/config/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const REPORT_GEN_PROMPT = `You are an AI Travel Agent that just finished a voice conversation with a user. Based on the travel AI agent info and the conversation between the AI travel agent and the user, generate a structured travel report with the following fields:

1. agent: the travel specialist name (e.g., "CityExplorer AI")  
2. user: name of the traveler or "Anonymous" if not provided  
3. timestamp: current date and time in ISO format  
4. tripPurpose: one‐sentence summary of why the user is traveling (e.g., “sightseeing”, “business”, “family visit”)  
5. summary: a 2–3 sentence overview of the conversation, including key preferences and constraints  
6. currentLocation: the user’s last known GPS‐derived location or city  
7. recommendedItinerary: an ordered list of POIs or activities suggested, each with mode of transport and estimated times  
8. transportationUpdates: list of any real‐time issues mentioned (e.g., “subway delay on Line 2”, “heavy traffic on Main St.”)  
9. weatherAlerts: list of any weather conditions or forecasts that could affect travel (e.g., “rain expected at 3 PM”)  
10. crowdAlerts: list of any crowd or obstruction warnings from user’s camera input (e.g., “entrance to museum is crowded”)  
11. recommendations: list of AI suggestions (e.g., “visit the art gallery tomorrow morning”, “take bus instead of subway”)  

Return the result in this exact JSON format (only include fields that have data):

\`\`\`json
{
  "agent": "string",
  "user": "string",
  "timestamp": "ISO Date string",
  "tripPurpose": "string",
  "summary": "string",
  "currentLocation": "string",
  "recommendedItinerary": [
    {
      "place": "string",
      "mode": "string",
      "eta": "string"
    }
  ],
  "transportationUpdates": ["string"],
  "weatherAlerts": ["string"],
  "crowdAlerts": ["string"],
  "recommendations": ["string"]
}
\`\`\`

Respond with nothing else.`


export async function POST(req: NextRequest) {
    const { sessionId, sessionDetail, messages } = await req.json()
  
    try {
      // Prefix with “AI Travel Agent Info” instead of medical
      const userInput =
        'AI Travel Agent Info:' +
        JSON.stringify(sessionDetail) +
        ', Conversation:' +
        JSON.stringify(messages)
  
      const completion = await openai.chat.completions.create({
        model: 'google/gemini-2.5-flash-preview-05-20',
        messages: [
          { role: 'system', content: REPORT_GEN_PROMPT },
          { role: 'user', content: userInput },
        ],
      })
  
      const raw = completion.choices[0].message?.content?.trim() ?? ''
      const jsonString = raw.replace(/^```json\s*/, '').replace(/```$/, '')
      const report = JSON.parse(jsonString)
  
      // Persist the travel report alongside the conversation
      await db
        .update(SessionChatTable)
        .set({
          report,
          conversation: messages,
        })
        .where(eq(SessionChatTable.sessionId, sessionId))
  
      return NextResponse.json(report)
    } catch (err) {
      console.error('REPORT GENERATION ERROR', err)
      return NextResponse.json(
        { error: (err as Error).message || err },
        { status: 500 }
      )
    }
  }