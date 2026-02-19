/**
 * Migration: Add AI moderation columns to youtube_comments table
 * Run: bun scripts/add-yt-comment-moderation.ts
 */
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Adding moderation columns to youtube_comments...");

  // Add is_toxic column
  await sql`
    ALTER TABLE youtube_comments
    ADD COLUMN IF NOT EXISTS is_toxic BOOLEAN NOT NULL DEFAULT false
  `;
  console.log("  ✓ is_toxic column added");

  // Add toxicity_score column
  await sql`
    ALTER TABLE youtube_comments
    ADD COLUMN IF NOT EXISTS toxicity_score REAL DEFAULT 0
  `;
  console.log("  ✓ toxicity_score column added");

  // Add is_hidden column
  await sql`
    ALTER TABLE youtube_comments
    ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false
  `;
  console.log("  ✓ is_hidden column added");

  console.log("\nDone! youtube_comments now has AI moderation columns.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
