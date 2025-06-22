// app/api/users/route.tsx
import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm"; // Import eq function
import { NextRequest, NextResponse } from "next/server";
import { logMessage } from '@/lib/logger'; // Already added

const CURRENT_FILE_NAME = 'users-route.tsx'; // Identifier for logs from this file

export async function POST(req: NextRequest) {
    logMessage('info', CURRENT_FILE_NAME, 'POST request to /api/users received.');
    const user = await currentUser();

    try {
        // FIX: Add a more comprehensive check for user and their email address
        if (!user || !user.primaryEmailAddress || !user.primaryEmailAddress.emailAddress) {
            logMessage('warn', CURRENT_FILE_NAME, 'POST request to /api/users: No authenticated user or primary email address found. Returning 401.');
            return NextResponse.json({ error: "Authentication required or primary email missing" }, { status: 401 });
        }
        // FIX: Assign the non-nullable email address to a variable
        const userEmail = user.primaryEmailAddress.emailAddress;
        logMessage('info', CURRENT_FILE_NAME, `Authenticated user: ${userEmail}`);

        // Check if User Already Exist
        const users = await db.select().from(usersTable)
            // FIX: Pass the non-nullable userEmail to the eq function
            // No @ts-ignore needed here if userEmail is guaranteed string
            .where(eq(usersTable.email, userEmail));
        
        if (users?.length === 0) {
            logMessage('info', CURRENT_FILE_NAME, `Creating new user: ${user?.fullName || userEmail}`);
            
            // Define a type for a single user record from your schema (if not already globally defined)
            type UserRecord = typeof usersTable.$inferSelect;

            // Explicitly cast the returning result to an array of UserRecord
            const result = await db.insert(usersTable).values({
                //@ts-ignore // Keep this if Clerk's user object types are still problematic for Drizzle
                name: user?.fullName,
                email: userEmail, // Use the non-nullable email
                credits: 10
            }).returning() as UserRecord[];

            if (result && result.length > 0 && result[0]) {
                logMessage('info', CURRENT_FILE_NAME, `New user created successfully: ${result[0].email}`);
            } else {
                logMessage('warn', CURRENT_FILE_NAME, `New user created, but no valid email found in return data.`);
            }
            return NextResponse.json(result[0]); // Return the first created user record
        }

        logMessage('info', CURRENT_FILE_NAME, `Existing user found: ${users[0]?.email}`);
        return NextResponse.json(users[0]);

    } catch (e: any) {
        if (e instanceof Error) {
            logMessage('error', CURRENT_FILE_NAME, `Error in POST /api/users: ${e.message}`);
        } else {
            logMessage('error', CURRENT_FILE_NAME, `Unknown error in POST /api/users: ${String(e)}`);
        }
        return NextResponse.json(e);
    }
}