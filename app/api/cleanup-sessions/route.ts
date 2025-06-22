// app/api/cleanup-sessions/route.ts
// This route would be triggered by an external cron job or scheduler.
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/config/db';
import { SessionChatTable } from '@/config/schema';
import { lt } from 'drizzle-orm';
import { logMessage } from '@/lib/logger';

const CURRENT_FILE_NAME = 'cleanup-sessions-route.ts';
// Define how long a session can be inactive before its conversation/report data is cleaned
const SESSION_INACTIVITY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // Example: 24 hours (86,400,000 ms)

export async function GET(req: NextRequest) { // Using GET is common for cron jobs, POST is also fine
  logMessage('info', CURRENT_FILE_NAME, 'Session cleanup job initiated.');

  try {
    const cutoffTime = new Date(Date.now() - SESSION_INACTIVITY_THRESHOLD_MS);
    const cutoffTimeString = cutoffTime.toISOString(); // Convert to ISO string for database comparison

    // Select sessions that are inactive (lastActiveAt is older than cutoffTime)
    // If `lastActiveAt` is not yet updated or null, `createdOn` acts as a fallback for initial cleanup.
    const sessionsToClean = await db.select()
        .from(SessionChatTable)
        .where(lt(SessionChatTable.lastActiveAt || SessionChatTable.createdOn, cutoffTimeString));

    if (sessionsToClean.length > 0) {
        logMessage('info', CURRENT_FILE_NAME, `Found ${sessionsToClean.length} sessions for cleanup.`);
        const sessionIdsToClean = sessionsToClean.map(s => s.sessionId);

        // Perform the update to clear conversation and report for these sessions
        // This is a "soft" cleanup; the session record itself remains, but its data is reset.
        await db.update(SessionChatTable).set({
            conversation: null,
            report: null
        }).where(lt(SessionChatTable.lastActiveAt || SessionChatTable.createdOn, cutoffTimeString));

        logMessage('info', CURRENT_FILE_NAME, `Cleanup job completed. Cleared conversations/reports for sessions: ${sessionIdsToClean.join(', ')}.`);
    } else {
        logMessage('info', CURRENT_FILE_NAME, 'No inactive sessions found for cleanup.');
    }

    return NextResponse.json({ message: 'Session cleanup successful' });
  } catch (error: any) {
    logMessage('error', CURRENT_FILE_NAME, `Session cleanup job failed: ${error.message}`);
    return NextResponse.json({ error: 'Session cleanup failed' }, { status: 500 });
  }
}