// app/api/chat-history/[sessionId]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/config/db'; // Your Drizzle DB connection
import { SessionChatTable } from '@/config/schema'; // Your session schema
import { eq } from 'drizzle-orm'; // Import the 'eq' (equals) operator from Drizzle ORM
import { logMessage } from '@/lib/logger'; // Your shared logger utility

const CURRENT_FILE_NAME = 'chat-history-route.ts'; // Identifier for logs from this file

// GET request handler: Retrieves the chat history for a given session ID.
export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId; // Extract sessionId from the URL parameters
  logMessage('info', CURRENT_FILE_NAME, `Attempting to retrieve chat history for session: ${sessionId}`);

  try {
    // Query the database for the session matching the sessionId
    const sessionData = await db.select().from(SessionChatTable).where(eq(SessionChatTable.sessionId, sessionId)).limit(1);

    // If no session is found, return a 404 error
    if (sessionData.length === 0) {
      logMessage('warn', CURRENT_FILE_NAME, `Chat history not found for session: ${sessionId}`);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Extract the conversation array from the session data, default to empty array if null
    const conversation = (sessionData[0].conversation as any[]) || [];
    // Filter and map the conversation to extract only user messages for display, similar to old backend
    const userMessages = conversation
      .filter(msg => msg.role === "user" && msg.parts && msg.parts[0] && msg.parts[0].text)
      .map(msg => msg.parts[0].text);

    logMessage('info', CURRENT_FILE_NAME, `Successfully retrieved chat history for session: ${sessionId}`);
    return NextResponse.json({ messages: userMessages }); // Return the filtered user messages
  } catch (err: any) {
    // Log any database or retrieval errors
    logMessage('error', CURRENT_FILE_NAME, `Error retrieving chat history for session ${sessionId}: ${err.message}`);
    return NextResponse.json({ error: "Failed to retrieve chat history" }, { status: 500 });
  }
}

// DELETE request handler: Clears the chat history for a given session ID.
export async function DELETE(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId; // Extract sessionId from the URL parameters
  logMessage('info', CURRENT_FILE_NAME, `Attempting to clear chat history for session: ${sessionId}`);

  try {
    // Update the session in the database to set conversation and report to null.
    // This performs a "soft delete" or reset of the chat content, keeping the session record itself.
    const result = await db.update(SessionChatTable).set({
      conversation: null, // Clear conversation history
      report: null,       // Clear any generated report
    }).where(eq(SessionChatTable.sessionId, sessionId));

    // Check if the session actually existed before attempting to clear.
    // Drizzle's `rowCount` might not be consistently available depending on the DB driver.
    // A separate select query is a robust way to check if the record exists.
    if (result.rowCount === 0) {
        const checkExisting = await db.select().from(SessionChatTable).where(eq(SessionChatTable.sessionId, sessionId)).limit(1);
        if (checkExisting.length === 0) {
            logMessage('warn', CURRENT_FILE_NAME, `Attempted to clear chat history for non-existent session: ${sessionId}`);
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }
    }

    logMessage('info', CURRENT_FILE_NAME, `Successfully cleared chat history for session: ${sessionId}`);
    return NextResponse.json({ message: "Chat history cleared" }); // Confirm success
  } catch (err: any) {
    // Log any database or update errors
    logMessage('error', CURRENT_FILE_NAME, `Error clearing chat history for session ${sessionId}: ${err.message}`);
    return NextResponse.json({ error: "Failed to clear chat history" }, { status: 500 });
  }
}