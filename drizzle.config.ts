// drizzle.config.ts
import 'dotenv/config'; // Loads .env variables for this config file
import { defineConfig } from 'drizzle-kit';

// --- TEMPORARY DEBUGGING LOG (REMOVE AFTER FIXING) ---
console.log(`[DRIZZLE-CONFIG-DEBUG] DATABASE_URL from process.env: ${process.env.DATABASE_URL}`);
// -----------------------------------------------------

export default defineConfig({
    schema: './config/schema.tsx',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});