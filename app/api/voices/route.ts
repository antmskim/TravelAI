// app/api/voices/route.ts
import { NextResponse, NextRequest } from 'next/server';
import voice from 'elevenlabs-node'; // Make sure elevenlabs-node is installed in your main package.json
import { logMessage } from '@/lib/logger'; // Your shared logger utility

const CURRENT_FILE_NAME = 'voices-route.ts'; // Identifier for logs from this file

export async function GET(req: NextRequest) {
  const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY; // Access API key from environment variables

  // Check if the API key is configured
  if (!elevenLabsApiKey) {
    logMessage('error', CURRENT_FILE_NAME, 'ElevenLabs API key is not configured. Cannot fetch voices.');
    return NextResponse.json({ error: "ElevenLabs API key is missing." }, { status: 500 });
  }

  try {
    // Attempt to fetch voices from ElevenLabs
    const voices = await voice.getVoices(elevenLabsApiKey);
    logMessage('info', CURRENT_FILE_NAME, 'Successfully fetched ElevenLabs voices.');
    return NextResponse.json(voices); // Return the fetched voices as JSON
  } catch (err: any) {
    // Log any errors during the voice fetching process
    logMessage('error', CURRENT_FILE_NAME, `Failed to fetch ElevenLabs voices: ${err.message}`);
    return NextResponse.json({ error: "Failed to fetch voices" }, { status: 500 });
  }
}