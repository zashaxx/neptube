/**
 * Reset all video view counts to match real unique entries from watch_history.
 *
 * This removes fake/seeded view counts and replaces them with the actual
 * number of unique users who watched each video.
 *
 * Usage: bun run scripts/reset-view-counts.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../src/db/index";

async function main() {
  console.log("Resetting view counts to real watch_history data...\n");

  // Update every video's view_count to the number of unique users in watch_history
  await db.execute(sql`
    UPDATE videos
    SET view_count = COALESCE(wh.real_views, 0)
    FROM (
      SELECT video_id, COUNT(DISTINCT user_id) AS real_views
      FROM watch_history
      GROUP BY video_id
    ) wh
    WHERE videos.id = wh.video_id
  `);

  console.log("✓ Updated videos that have watch history entries.");

  // Set view_count to 0 for videos that have NO watch_history entries at all
  await db.execute(sql`
    UPDATE videos
    SET view_count = 0
    WHERE id NOT IN (SELECT DISTINCT video_id FROM watch_history)
  `);

  console.log("✓ Set view_count = 0 for videos with no real watches.");

  // Print summary
  const summary = await db.execute(sql`
    SELECT
      COUNT(*) AS total_videos,
      SUM(CASE WHEN view_count = 0 THEN 1 ELSE 0 END) AS zero_views,
      SUM(CASE WHEN view_count > 0 THEN 1 ELSE 0 END) AS has_views,
      SUM(view_count) AS total_real_views
    FROM videos
  `);

  const row = summary.rows[0] as Record<string, unknown>;
  console.log("\n── Summary ──");
  console.log(`Total videos:     ${row.total_videos}`);
  console.log(`With real views:  ${row.has_views}`);
  console.log(`With zero views:  ${row.zero_views}`);
  console.log(`Total real views: ${row.total_real_views}`);
  console.log("\nDone!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
