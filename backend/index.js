// index.js

import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
dotenv.config();

// --- Gemini client -----------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = "rU18Fk3uSDhmg5Xh41o4";

// --- Express setup -----------------
const app = express();
app.use(express.json({ limit: '50mb' })); // Increased limit for images
app.use(cors());
const port = 3000;

// --- Chat Sessions Storage ---------
const chatSessions = new Map(); // sessionId -> { history: [], location: null, lastActivity: timestamp }
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Clean up old sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of chatSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      chatSessions.delete(sessionId);
      console.log(`Cleaned up session: ${sessionId}`);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// --- Utility to run shell commands (ffmpeg, rhubarb) ---
const execCommand = (cmd) =>
  new Promise((resolve, reject) =>
    exec(cmd, (err, stdout) => (err ? reject(err) : resolve(stdout)))
  );

// --- Convert MP3 → WAV → Rhubarb JSON for lipsync ---
const lipSyncMessage = async (idx, sessionId = 'default') => {
  const t0 = Date.now();
  await execCommand(
    `ffmpeg -y -i audios/message_${sessionId}_${idx}.mp3 audios/message_${sessionId}_${idx}.wav`
  );
  await execCommand(
    `./bin/rhubarb -f json -o audios/message_${sessionId}_${idx}.json audios/message_${sessionId}_${idx}.wav -r phonetic`
  );
  console.log(`LipSync ${sessionId}_${idx} done in ${Date.now() - t0}ms`);
};

// --- Get or create chat session ---
const getOrCreateSession = (sessionId, location = null) => {
  if (!chatSessions.has(sessionId)) {
    chatSessions.set(sessionId, {
      history: [
        { role: "user", parts: [{ text: "Hello" }] },
        {
          role: "model",
          parts: [
            {
              text: JSON.stringify({
                messages: [
                  {
                    text: "Welcome! I'm your personal travel agent. Where would you like to go?",
                    facialExpression: "smile",
                    animation: "Talking_1",
                  },
                ],
              }),
            },
          ],
        },
      ],
      location: location,
      lastActivity: Date.now(),
    });
  } else {
    // Update last activity and location if provided
    const session = chatSessions.get(sessionId);
    session.lastActivity = Date.now();
    if (location) {
      session.location = location;
    }
  }
  return chatSessions.get(sessionId);
};

// --- Endpoints ----------------------

// Health check
app.get("/", (req, res) => res.send("Hello World!"));

// List available ElevenLabs voices
app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

// Get chat history for a session
app.get("/chat/history/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  const session = chatSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  
  // Return user messages from history (excluding system messages)
  const userMessages = session.history
    .filter(msg => msg.role === "user" && msg.parts[0].text !== "Hello")
    .map(msg => msg.parts[0].text);
    
  res.json({ messages: userMessages });
});

// Clear chat history for a session
app.delete("/chat/history/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  if (chatSessions.has(sessionId)) {
    chatSessions.delete(sessionId);
    res.json({ message: "Chat history cleared" });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

// Chat POST
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  const location = req.body.location;
  const sessionId = req.body.sessionId || `session_${Date.now()}`;
  const image = req.body.image; // This will contain the image data from frontend
  const session = getOrCreateSession(sessionId, location);

  // API keys check
  if (!elevenLabsApiKey || !process.env.GEMINI_API_KEY || !process.env.GOOGLE_MAPS_API_KEY) {
    return res.send({
      messages: [{ text: "API keys are not configured correctly." }],
      sessionId: sessionId,
    });
  }
  
  // Get nearby places using Google Maps API
  const currentLocation = location || session.location;
  let places = [];
  if (currentLocation) {
    console.log("Location received, calling Google Maps API:", currentLocation);
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = "https://places.googleapis.com/v1/places:searchNearby";
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.displayName,places.primaryTypeDisplayName",
        },
        body: JSON.stringify({
          includedTypes: ["restaurant", "tourist_attraction", "cafe"], 
          maxResultCount: 10,
          locationRestriction: {
            circle: {
              center: {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              },
              radius: 1500.0, // 1.5km radius
            },
          },
        }),
      });
      const data = await response.json();

      if (data.places) {
        places = data.places.map(place => `${place.displayName.text} (${place.primaryTypeDisplayName.text})`);
      } else {
        console.error("Google Maps API Error:", data);
      }
      console.log("Nearby places from Google:", places);
    } catch (err) {
      console.error("Google Maps fetch error:", err);
    }
  }

  // --- Gemini AI Chat Logic with Image Support ---
  
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest",
    generationConfig: { responseMimeType: "application/json" },
  });

  // Prepare the user message parts
  const userParts = [];
  
  // Add text if provided
  if (userMessage && userMessage.trim()) {
    userParts.push({ text: userMessage });
  }
  
  // Add image if provided
  if (image && image.inlineData) {
    userParts.push({
      inlineData: {
        data: image.inlineData.data,
        mimeType: image.inlineData.mimeType
      }
    });
    console.log("Image received with mime type:", image.inlineData.mimeType);
  }

  // If no text or image, send a default message
  if (userParts.length === 0) {
    userParts.push({ text: "Hello" });
  }

  session.history.push({ role: "user", parts: userParts });
  const chatSession = model.startChat({ history: session.history });

  // IMPROVED PROMPTS - Clear distinction between current location and image content
  const currentLocationPrompt = currentLocation 
    ? `IMPORTANT: The user's CURRENT PHYSICAL LOCATION has these nearby places: ${places.join(", ")}. This is where they are RIGHT NOW, not necessarily what's in any image they might share.`
    : "The user's current location is not available.";

  const imagePrompt = image 
    ? "IMPORTANT: The user has shared an image. This image may show a DIFFERENT location than where they currently are. Analyze the image content and provide travel advice about what you see in the image, but remember to distinguish between their current location and the location shown in the image."
    : "";

  const textPrompt = userMessage && userMessage.trim() 
    ? `User's message: "${userMessage}"`
    : "The user has sent you an image or is greeting you.";

  const fullPrompt = `You are a friendly travel agent with memory of our conversation.

Always reply with a valid JSON object: {"messages": [{"text": "...", "facialExpression": "...", "animation": "..."}]}.

FacialExpressions: smile, sad, angry, surprised, funnyFace, default.
Animations: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, Angry.

${currentLocationPrompt}

${imagePrompt}

${textPrompt}

CRITICAL INSTRUCTION: If the user shares an image of a place:
1. Clearly distinguish between their current physical location and the location shown in the image
2. If they ask about visiting the place in the image, provide advice about traveling FROM their current location TO the place in the image
3. If they're asking about the place in the image itself, focus on that destination
4. Don't keep it too long.

Be enthusiastic and helpful, but always maintain clarity about location context!`;

  try {
    const result = await chatSession.sendMessage(fullPrompt);
    const aiResp = await result.response;
    const aiRespText = aiResp.text();
    let messages;

    try {
      messages = JSON.parse(aiRespText).messages;
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", aiRespText);
      messages = [{
        text: "I'm sorry, I had trouble processing that request. Could you try again?",
        facialExpression: "default",
        animation: "Talking_0"
      }];
    }

    session.history.push({ role: "model", parts: [{ text: aiRespText }] });

    // Generate audio and lipsync for each message
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const file = `audios/message_${sessionId}_${i}.mp3`;
      
      try {
        await voice.textToSpeech(elevenLabsApiKey, voiceID, file, msg.text);
        await lipSyncMessage(i, sessionId);
        msg.audio = await audioFileToBase64(file);
        msg.lipsync = await readJsonTranscript(`audios/message_${sessionId}_${i}.json`);
      } catch (audioError) {
        console.error(`Audio generation failed for message ${i}:`, audioError);
        // Continue without audio if there's an error
        msg.audio = null;
        msg.lipsync = null;
      }
    }

    res.send({ messages, sessionId, history: session.history });

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).send({
      messages: [{
        text: "I'm sorry, I encountered an error processing your request. Please try again.",
        facialExpression: "sad",
        animation: "Talking_0"
      }],
      sessionId: sessionId
    });
  }
});

// Helper functions
const readJsonTranscript = async (file) => {
  try {
    const txt = await fs.readFile(file, "utf8");
    return JSON.parse(txt);
  } catch (error) {
    console.error("Error reading transcript file:", error);
    return null;
  }
};

const audioFileToBase64 = async (file) => {
  try {
    const buf = await fs.readFile(file);
    return buf.toString("base64");
  } catch (error) {
    console.error("Error reading audio file:", error);
    return null;
  }
};

app.listen(port, () => {
  console.log(`Virtual Agent listening on port ${port}`);
});