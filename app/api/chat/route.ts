// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/config/db'; // Your Drizzle DB connection
import { SessionChatTable } from '@/config/schema'; // Your session schema
import { eq } from 'drizzle-orm';
import { logMessage } from '@/lib/logger'; // Your shared logger
import path from 'path';
import { promises as fs } from 'fs'; // For file system operations (readFile, appendFile, unlink, mkdir, rm)
import { exec } from 'child_process'; // For executing ffmpeg/rhubarb
import voice from 'elevenlabs-node'; // For ElevenLabs API

const CURRENT_FILE_NAME = 'chat-route.ts'; // For logging context within this file

// --- Configuration from Environment Variables ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const Maps_API_KEY = process.env.Maps_API_KEY!;
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY!;
const ELEVEN_LABS_VOICE_ID = "rU18Fk3uSDhmg5Xh41o4"; // Your ElevenLabs voice ID (from backend/index.js)

// --- File Paths for Temporary Audio/Lipsync ---
// This directory will be created at the root of your Next.js project (process.cwd())
// and used for temporary audio files during processing.
const TEMP_BASE_DIR = path.join(process.cwd(), 'tmp_audio_processing'); // A more general temp directory
const RHUBARB_BIN_PATH = path.join(process.cwd(), 'bin', 'rhubarb'); // Assumes 'bin' is at project root

// --- Helper Functions for Media Processing (Migrated from backend/index.js) ---

/**
 * Executes a shell command and returns its stdout.
 * @param {string} cmd - The command string to execute.
 * @returns {Promise<string>} - A promise that resolves with stdout on success.
 */
const execCommand = (cmd: string): Promise<string> =>
  new Promise((resolve, reject) =>
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        // Log both error message and stderr for better debugging
        logMessage('error', CURRENT_FILE_NAME, `Exec command failed: ${cmd} - Error: ${err.message}. Stderr: ${stderr}`);
        reject(new Error(`Command failed: ${cmd}\nError: ${err.message}\nStderr: ${stderr}`));
      } else {
        logMessage('info', CURRENT_FILE_NAME, `Exec command successful: ${cmd}`);
        resolve(stdout);
      }
    })
  );

/**
 * Generates lip-sync data (JSON) from an MP3 file using ffmpeg and rhubarb.
 * @param {number} idx - Index of the message for file naming.
 * @param {string} sessionId - Current session ID for file naming.
 * @param {string} tempDir - The temporary directory path for current session's audio.
 * @returns {Promise<string>} - A promise that resolves with the path to the generated JSON.
 */
const lipSyncMessage = async (idx: number, sessionId: string, tempDir: string): Promise<string> => {
  const t0 = Date.now();
  const mp3Path = path.join(tempDir, `message_${sessionId}_${idx}.mp3`);
  const wavPath = path.join(tempDir, `message_${sessionId}_${idx}.wav`);
  const jsonPath = path.join(tempDir, `message_${sessionId}_${idx}.json`);

  try {
    // Convert MP3 to WAV using ffmpeg
    // ffmpeg is assumed to be in the system's PATH.
    await execCommand(
      `ffmpeg -y -i "${mp3Path}" "${wavPath}"` // Use quotes for paths to handle spaces/special chars
    );

    // Generate lip-sync JSON using rhubarb
    // RHUBARB_BIN_PATH points to the executable you placed in PROJECT_ROOT/bin/
    await execCommand(
      `"${RHUBARB_BIN_PATH}" -f json -o "${jsonPath}" "${wavPath}" -r phonetic` // Use quotes for paths
    );
    logMessage('info', CURRENT_FILE_NAME, `LipSync for message ${sessionId}_${idx} done in ${Date.now() - t0}ms`);
    return jsonPath; // Return path to the generated JSON
  } catch (err: any) {
    logMessage('error', CURRENT_FILE_NAME, `LipSync failed for message ${sessionId}_${idx}: ${err.message}`);
    throw err; // Re-throw to be caught by the main POST handler
  } finally {
      // Clean up temporary WAV file immediately after use
      try {
          await fs.unlink(wavPath);
          logMessage('info', CURRENT_FILE_NAME, `Cleaned up temp WAV file: ${wavPath}`);
      } catch (e: any) {
          logMessage('warn', CURRENT_FILE_NAME, `Failed to delete temp WAV: ${wavPath} - ${e.message}`);
      }
  }
};

/**
 * Reads a JSON transcript file and parses its content.
 * @param {string} filePath - The path to the JSON file.
 * @returns {Promise<any | null>} - A promise resolving to the parsed JSON or null if an error occurs.
 */
const readJsonTranscript = async (filePath: string): Promise<any | null> => {
  try {
    const txt = await fs.readFile(filePath, "utf8");
    return JSON.parse(txt);
  } catch (error: any) {
    logMessage('error', CURRENT_FILE_NAME, `Error reading transcript file ${filePath}: ${error.message}`);
    return null;
  } finally {
      // Clean up temporary JSON file immediately after use
      try {
          await fs.unlink(filePath);
          logMessage('info', CURRENT_FILE_NAME, `Cleaned up temp JSON file: ${filePath}`);
      } catch (e: any) {
          logMessage('warn', CURRENT_FILE_NAME, `Failed to delete temp JSON: ${filePath} - ${e.message}`);
      }
  }
};

/**
 * Reads an audio file and converts its content to a Base64 string.
 * @param {string} filePath - The path to the audio file.
 * @returns {Promise<string | null>} - A promise resolving to the Base64 string or null if an error occurs.
 */
const audioFileToBase64 = async (filePath: string): Promise<string | null> => {
  try {
    const buf = await fs.readFile(filePath);
    return buf.toString("base64");
  } catch (error: any) {
    logMessage('error', CURRENT_FILE_NAME, `Error converting audio file to Base64 for ${filePath}: ${error.message}`);
    return null;
  } finally {
      // Clean up temporary MP3 file immediately after use
      try {
          await fs.unlink(filePath);
          logMessage('info', CURRENT_FILE_NAME, `Cleaned up temp MP3 file: ${filePath}`);
      } catch (e: any) {
          logMessage('warn', CURRENT_FILE_NAME, `Failed to delete temp MP3: ${filePath} - ${e.message}`);
      }
  }
};

// --- Main API Route Handler ---
export async function POST(req: NextRequest) {
  // Extract data from the request body
  const { message: userMessage, location, sessionId, image } = await req.json();

  logMessage('info', CURRENT_FILE_NAME, `Chat request for session ${sessionId}. User message: "${userMessage || '[No Text]'}". Image: ${image ? 'Yes' : 'No'}. Location: ${JSON.stringify(location)}`);

  // Initial API keys check
  if (!GEMINI_API_KEY || !Maps_API_KEY || !ELEVEN_LABS_API_KEY) {
    logMessage('error', CURRENT_FILE_NAME, 'API keys are not configured correctly. Gemini, Google Maps, or ElevenLabs API key missing.');
    return NextResponse.json({
      messages: [{ text: "API keys are not configured correctly." }],
      sessionId: sessionId,
    }, { status: 500 });
  }

  // Initialize Gemini AI model
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest",
    generationConfig: { responseMimeType: "application/json" },
  });

  let currentHistory: any[] = []; // This will hold the full conversation history for Gemini
  let existingSessionInDb; // To store existing session details if found

  // Step 1: Retrieve existing session and conversation history from DB
  try {
    const sessionData = await db.select().from(SessionChatTable).where(eq(SessionChatTable.sessionId, sessionId)).limit(1);
    
    if (sessionData.length > 0) {
      existingSessionInDb = sessionData[0];
      // If conversation is null/undefined in DB, initialize as empty array
      currentHistory = (existingSessionInDb.conversation as any[]) || [];
      logMessage('info', CURRENT_FILE_NAME, `Loaded existing session ${sessionId} with ${currentHistory.length} history entries from DB.`);
    } else {
      // If session does not exist (this API route typically expects it to be created upstream by AddNewSessionDialog)
      // Initialize a new conversation history including a default agent greeting for Gemini's context.
      currentHistory = [
        { role: "user", parts: [{ text: "Hello" }] }, // This initial user message can be from the agent's side
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
      ];
      logMessage('warn', CURRENT_FILE_NAME, `Session ${sessionId} not found in DB. Initializing new conversation history for Gemini's context.`);
      // IMPORTANT: If this scenario genuinely implies a new session that should be saved,
      // you would need to insert a new row into SessionChatTable here.
      // For this migration, we assume sessions are created beforehand.
    }
  } catch (dbError: any) {
    logMessage('error', CURRENT_FILE_NAME, `Database error retrieving session ${sessionId}: ${dbError.message}`);
    return NextResponse.json({ messages: [{ text: "Error loading conversation history." }] }, { status: 500 });
  }

  // Step 2: Get nearby places using Google Maps API (if location is provided)
  let places: string[] = [];
  if (location) {
    logMessage('info', CURRENT_FILE_NAME, `Fetching nearby places for location: ${JSON.stringify(location)}`);
    const googleMapsPlacesUrl = "https://places.googleapis.com/v1/places:searchNearby";
    try {
      const response = await fetch(googleMapsPlacesUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": Maps_API_KEY,
          "X-Goog-FieldMask": "places.displayName,places.primaryTypeDisplayName",
        },
        body: JSON.stringify({
          includedTypes: ["restaurant", "tourist_attraction", "cafe"], // Example types
          maxResultCount: 10,
          locationRestriction: {
            circle: {
              center: {
                latitude: location.latitude,
                longitude: location.longitude,
              },
              radius: 1500.0, // 1.5km radius
            },
          },
        }),
      });
      const data = await response.json();
      if (data.places) {
        places = data.places.map((place: any) => `${place.displayName.text} (${place.primaryTypeDisplayName.text})`);
        logMessage('info', CURRENT_FILE_NAME, `Successfully fetched ${places.length} nearby places from Google.`);
      } else {
        logMessage('warn', CURRENT_FILE_NAME, `Google Maps API returned no places or unexpected data: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      logMessage('error', CURRENT_FILE_NAME, `Google Maps API fetch error: ${err.message}`);
    }
  } else {
    logMessage('info', CURRENT_FILE_NAME, 'No current location available from frontend for nearby places search.');
  }

  // Step 3: Prepare user message for Gemini prompt
  const userParts: any[] = [];
  if (userMessage && userMessage.trim()) {
    userParts.push({ text: userMessage });
  }
  if (image && image.inlineData) {
    userParts.push({ inlineData: { data: image.inlineData.data, mimeType: image.inlineData.mimeType } });
    logMessage('info', CURRENT_FILE_NAME, `Image received with mime type: ${image.inlineData.mimeType}`);
  }
  if (userParts.length === 0) {
    userParts.push({ text: "Hello" }); // Default greeting if no specific text/image
  }

  // Append current user message to conversation history
  currentHistory.push({ role: "user", parts: userParts });

  // Step 4: Construct the full prompt for Gemini AI
  const currentLocationPrompt = location
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

  // Step 5: Call Gemini AI and process response
  let messagesForFrontend: any[] = []; // Array of AI messages with audio/lipsync for frontend
  let tempSessionAudioDir: string | undefined; // Unique temporary directory for this request's audio

  try {
    logMessage('info', CURRENT_FILE_NAME, `Sending prompt to Gemini AI for session ${sessionId}.`);
    const chatSession = model.startChat({ history: currentHistory });
    const geminiResult = await chatSession.sendMessage(fullPrompt);
    const aiResp = await geminiResult.response;
    const aiRespText = aiResp.text();
    let parsedAiMessages: any[]; // Raw parsed messages from Gemini's JSON response

    try {
      parsedAiMessages = JSON.parse(aiRespText).messages;
      logMessage('info', CURRENT_FILE_NAME, `Successfully parsed AI response for session ${sessionId}.`);
    } catch (parseError: any) {
      logMessage('error', CURRENT_FILE_NAME, `Failed to parse AI response as JSON for session ${sessionId}: "${aiRespText}". Error: ${parseError.message}`);
      parsedAiMessages = [{
        text: "I'm sorry, I had trouble processing that request. Could you try again?",
        facialExpression: "default",
        animation: "Talking_0"
      }];
    }

    // Append AI response to history for persistence
    currentHistory.push({ role: "model", parts: [{ text: aiRespText }] });

    // Step 6: Persist updated conversation history to the database
    // Also update lastActiveAt timestamp
    await db.update(SessionChatTable).set({
      conversation: currentHistory as any, // Cast to any for Drizzle's JSON type
      lastActiveAt: new Date().toISOString() // Update last active timestamp
    }).where(eq(SessionChatTable.sessionId, sessionId));
    logMessage('info', CURRENT_FILE_NAME, `Updated conversation and lastActiveAt in DB for session ${sessionId}.`);

    // Step 7: Generate audio and lipsync for each AI message
    // Create a temporary directory unique to this request to avoid conflicts
    tempSessionAudioDir = path.join(TEMP_BASE_DIR, sessionId + '-' + Date.now());
    await fs.mkdir(tempSessionAudioDir, { recursive: true });
    logMessage('info', CURRENT_FILE_NAME, `Created temporary directory for audio: ${tempSessionAudioDir}`);

    for (let i = 0; i < parsedAiMessages.length; i++) {
      const msg = parsedAiMessages[i];
      const mp3FileName = `message_${sessionId}_${i}.mp3`;
      const mp3Path = path.join(tempSessionAudioDir, mp3FileName);

      try {
        await voice.textToSpeech(ELEVEN_LABS_API_KEY!, ELEVEN_LABS_VOICE_ID, mp3Path, msg.text);
        const jsonPath = await lipSyncMessage(i, sessionId, tempSessionAudioDir);
        msg.audio = await audioFileToBase64(mp3Path); // This also cleans up mp3
        msg.lipsync = await readJsonTranscript(jsonPath); // This also cleans up json
        logMessage('info', CURRENT_FILE_NAME, `Audio and lipsync generated for message ${i} of session ${sessionId}.`);
        messagesForFrontend.push(msg); // Add message with audio/lipsync to the response array
      } catch (audioError: any) {
        logMessage('error', CURRENT_FILE_NAME, `Audio or lipsync generation failed for message ${i} of session ${sessionId}: ${audioError.message}`);
        // Ensure audio and lipsync fields are null if generation failed, but still send the text
        msg.audio = null;
        msg.lipsync = null;
        messagesForFrontend.push(msg);
      }
    }

    // Step 8: Return response to frontend
    return NextResponse.json({ messages: messagesForFrontend, sessionId, history: currentHistory });

  } catch (error: any) {
    logMessage('error', CURRENT_FILE_NAME, `Gemini API or overall chat processing error for session ${sessionId}: ${error.message}`);
    return NextResponse.json({
      messages: [{
        text: "I'm sorry, I encountered an error processing your request. Please try again.",
        facialExpression: "sad",
        animation: "Talking_0"
      }],
      sessionId: sessionId,
      history: currentHistory // Still return current history even on error
    }, { status: 500 });
  } finally {
      // Final cleanup of the temporary directory for this request
      if (tempSessionAudioDir) {
          try {
              await fs.rm(tempSessionAudioDir, { recursive: true, force: true });
              logMessage('info', CURRENT_FILE_NAME, `Cleaned up temporary audio directory: ${tempSessionAudioDir}`);
          } catch (cleanupError: any) {
              logMessage('warn', CURRENT_FILE_NAME, `Failed to clean up temp dir ${tempSessionAudioDir}: ${cleanupError.message}`);
          }
      }
  }
}