/**
 * Apply unique constraints migration
 * Run: bun run scripts/apply-unique-constraints.ts
 */
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Applying unique constraints...\n");

  const queries = [
    {
      name: "video_likes_user_video_idx",
      sql: sql`CREATE UNIQUE INDEX IF NOT EXISTS "video_likes_user_video_idx" ON "video_likes" ("user_id", "video_id")`,
    },
    {
      name: "subscriptions_subscriber_channel_idx",
      sql: sql`CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_subscriber_channel_idx" ON "subscriptions" ("subscriber_id", "channel_id")`,
    },
    {
      name: "watch_history_user_video_idx",
      sql: sql`CREATE UNIQUE INDEX IF NOT EXISTS "watch_history_user_video_idx" ON "watch_history" ("user_id", "video_id")`,
    },
    {
      name: "playlist_videos_playlist_video_idx",
      sql: sql`CREATE UNIQUE INDEX IF NOT EXISTS "playlist_videos_playlist_video_idx" ON "playlist_videos" ("playlist_id", "video_id")`,
    },
  ];

  for (const q of queries) {
    try {
      await db.execute(q.sql);
      console.log(`✓ Created index: ${q.name}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("already exists")) {
        console.log(`⊘ Index already exists: ${q.name}`);
      } else {
        console.error(`✗ Failed to create ${q.name}:`, message);
      }
    }
  }

  console.log("\nDone!");
  process.exit(0);
}

main();
