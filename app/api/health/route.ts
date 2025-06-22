// app/api/health/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { logMessage } from '@/lib/logger'; // Your shared logger utility

const CURRENT_FILE_NAME = 'health-route.ts'; // Identifier for logs from this file

// GET request handler: Responds with a simple status to indicate API health.
export async function GET(req: NextRequest) {
  logMessage('info', CURRENT_FILE_NAME, 'Health check endpoint hit.'); // Log the access
  return NextResponse.json({ status: 'OK', message: 'API is healthy' }); // Return a success response
}