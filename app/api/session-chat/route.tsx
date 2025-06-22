// app/api/session-chat/route.tsx
import { db } from "@/config/db";
import { SessionChatTable } from "@/config/schema";
import { currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';
import { logMessage } from '@/lib/logger'; // FIX: Added logger import

const CURRENT_FILE_NAME = 'session-chat-route.tsx'; // Identifier for logs from this file

export async function POST(req: NextRequest) {
    logMessage('info', CURRENT_FILE_NAME, 'POST request to /api/session-chat received.'); // FIX: Added log message
    const { notes, selectedDoctor } = await req.json(); // Note: selectedDoctor might be selectedAgent from frontend
    const user = await currentUser();

    if (!user) {
        logMessage('warn', CURRENT_FILE_NAME, 'POST request to /api/session-chat: No authenticated user found.');
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    logMessage('info', CURRENT_FILE_NAME, `Authenticated user for new session: ${user.primaryEmailAddress?.emailAddress}`);


    try {
        const sessionId = uuidv4();
        logMessage('info', CURRENT_FILE_NAME, `Creating new session with ID: ${sessionId}`);
        const result = await db.insert(SessionChatTable).values({
            sessionId: sessionId,
            createdBy: user?.primaryEmailAddress?.emailAddress,
            notes: notes,
            // Assuming `selectedDoctor` from old code is `selectedAgent` in new context
            selectedAgent: selectedDoctor, // Adapt variable name if frontend sends `selectedAgent`
            createdOn: (new Date()).toISOString(), // Using ISO string for consistency
            lastActiveAt: (new Date()).toISOString(), // Set initial lastActiveAt
            //@ts-ignore
        }).returning({ SessionChatTable });

        logMessage('info', CURRENT_FILE_NAME, `Session created successfully: ${sessionId}`);
        return NextResponse.json(result[0]?.SessionChatTable);
    } catch (e: any) { // FIX: Cast e to any for TypeScript error
        logMessage('error', CURRENT_FILE_NAME, `Error in POST /api/session-chat: ${e.message || JSON.stringify(e)}`); // FIX: Added log
        return NextResponse.json(e);
    }
}


export async function GET(req: NextRequest) {
    logMessage('info', CURRENT_FILE_NAME, 'GET request to /api/session-chat received.'); // FIX: Added log message
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const user = await currentUser();

    if (!user) {
        logMessage('warn', CURRENT_FILE_NAME, 'GET request to /api/session-chat: No authenticated user found.');
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    logMessage('info', CURRENT_FILE_NAME, `Authenticated user for session retrieval: ${user.primaryEmailAddress?.emailAddress}`);


    try {
        if (sessionId === 'all') { // Use strict equality (===)
            logMessage('info', CURRENT_FILE_NAME, `Retrieving all sessions for user: ${user?.primaryEmailAddress?.emailAddress}`);
            const result = await db.select().from(SessionChatTable)
                //@ts-ignore
                .where(eq(SessionChatTable.createdBy, user?.primaryEmailAddress?.emailAddress))
                .orderBy(desc(SessionChatTable.id));
            logMessage('info', CURRENT_FILE_NAME, `Found ${result.length} sessions for user.`);
            return NextResponse.json(result);
        } else {
            logMessage('info', CURRENT_FILE_NAME, `Retrieving session by ID: ${sessionId}`);
            const result = await db.select().from(SessionChatTable)
                //@ts-ignore
                .where(eq(SessionChatTable.sessionId, sessionId));
            if (result[0]) {
                logMessage('info', CURRENT_FILE_NAME, `Session ${sessionId} found.`);
            } else {
                logMessage('warn', CURRENT_FILE_NAME, `Session ${sessionId} not found.`);
            }
            return NextResponse.json(result[0]);
        }
    } catch (e: any) { // FIX: Cast e to any for TypeScript error
        logMessage('error', CURRENT_FILE_NAME, `Error in GET /api/session-chat: ${e.message || JSON.stringify(e)}`); // FIX: Added log
        return NextResponse.json(e);
    }
}