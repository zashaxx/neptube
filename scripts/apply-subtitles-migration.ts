/**
 * Apply subtitles_vtt migration
 * Run: bun run scripts/apply-subtitles-migration.ts
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import fs from "fs";
import path from "path";

config({ path: ".env.local" });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const migration = fs.readFileSync(
    path.join(__dirname, "../drizzle/0004_add_subtitles_vtt.sql"),
    "utf-8"
  );

  console.log("Applying subtitles_vtt migration...");
  await sql(migration);
  console.log("Migration applied successfully!");
}

main().catch(console.error);
