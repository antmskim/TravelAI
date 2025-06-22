// app/lib/logger.ts
import { promises as fs } from "fs";
import path from 'path';

// Determine the project root for Next.js applications
const PROJECT_ROOT = process.cwd();

// Define the path to the unified logs.txt file at the project root
const LOG_FILE_PATH = path.join(PROJECT_ROOT, 'logs.txt');

// --- CRITICAL DEBUGGING POINT ---
// This log should appear in your terminal as soon as the Next.js server starts and loads this module.
console.log(`[LOGGER INIT] Logger module loaded. PROJECT_ROOT: ${PROJECT_ROOT}, LOG_FILE_PATH: ${LOG_FILE_PATH}`);
// ---------------------------------

/**
 * Logs a message to the shared logs.txt file with a timestamp and the calling file's name.
 * @param {string} level - The log level (e.g., 'info', 'warn', 'error').
 * @param {string} callerFileName - The name of the file that initiated the log.
 * @param {string} message - The message content to log.
 */
export async function logMessage(level: string, callerFileName: string, message: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const logEntry = `<span class="math-inline">\{timestamp\} \[</span>{level.toUpperCase()}] [${callerFileName}] - ${message}\n`;

  // --- TEMPORARY DEBUGGING LOGS (REMOVE AFTER FIXING) ---
  console.log(`[LOGGER DEBUG] Attempting to log: ${logEntry.trim()}`);
  // -----------------------------------------------------

  try {
    // Ensure the log file exists or is created
    await fs.appendFile(LOG_FILE_PATH, logEntry);
    // --- TEMPORARY DEBUGGING LOGS (REMOVE AS SOON AS LOGGING WORKS) ---
    console.log(`[LOGGER DEBUG] Successfully wrote to log file.`);
    // -----------------------------------------------------
  } catch (error: any) {
    // Fallback to console.error if writing to file fails
    console.error(`[CRITICAL LOGGING ERROR] Failed to write to log file ${LOG_FILE_PATH}: ${error.message}`);
    console.error(`Original log message attempted: ${logEntry}`);
  }
}