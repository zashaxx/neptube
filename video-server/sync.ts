/**
 * Sync videos from the NepTube database to the local video server.
 * 
 * Fetches all video records from the database, downloads the video files
 * to ./video-server/videos/, and creates a videos.json index file.
 * 
 * Usage: bun run video-server/sync.ts
 * 
 * This lets the video server serve videos locally (fast, no CDN dependency)
 * for demos and offline playback.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import pg from "pg";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env.local");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const VIDEOS_DIR = join(import.meta.dir, "videos");
const INDEX_FILE = join(import.meta.dir, "videos.json");

interface VideoRow {
  id: string;
  title: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration: number | null;
}

interface VideoMeta {
  id: string;
  title: string;
  filename: string;
  originalUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  size?: number;
}

function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 100)
    .trim();
}

async function downloadFile(url: string, dest: string): Promise<number> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  
  const buffer = await response.arrayBuffer();
  await Bun.write(dest, buffer);
  return buffer.byteLength;
}

async function main() {
  console.log("🔄 Syncing videos from NepTube database...\n");

  // Create videos directory
  await mkdir(VIDEOS_DIR, { recursive: true });

  // Fetch all videos with URLs from the database
  const result = await pool.query(`
    SELECT id, title, video_url, thumbnail_url, duration 
    FROM videos 
    WHERE video_url IS NOT NULL 
    ORDER BY created_at DESC
  `);
  const rows = result.rows as VideoRow[];

  console.log(`📋 Found ${rows.length} videos in database\n`);

  const index: VideoMeta[] = [];
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const safeName = sanitizeFilename(row.title);
    // Determine file extension from URL
    let ext = ".mp4";
    if (row.video_url) {
      const urlPath = new URL(row.video_url).pathname;
      if (urlPath.endsWith(".webm")) ext = ".webm";
      else if (urlPath.endsWith(".mkv")) ext = ".mkv";
      else if (urlPath.endsWith(".mov")) ext = ".mov";
    }
    const filename = `${safeName}${ext}`;
    const filepath = join(VIDEOS_DIR, filename);

    // Check if already downloaded
    const existingFile = Bun.file(filepath);
    if (await existingFile.exists() && existingFile.size > 0) {
      console.log(`⏭  Skipping (exists): ${row.title}`);
      index.push({
        id: row.id,
        title: row.title,
        filename,
        originalUrl: row.video_url || undefined,
        thumbnailUrl: row.thumbnail_url || undefined,
        duration: row.duration || undefined,
        size: existingFile.size,
      });
      skipped++;
      continue;
    }

    // Download the video
    try {
      process.stdout.write(`⬇️  Downloading: ${row.title}...`);
      const size = await downloadFile(row.video_url!, filepath);
      console.log(` ✅ (${formatBytes(size)})`);
      
      index.push({
        id: row.id,
        title: row.title,
        filename,
        originalUrl: row.video_url || undefined,
        thumbnailUrl: row.thumbnail_url || undefined,
        duration: row.duration || undefined,
        size,
      });
      downloaded++;
    } catch (err) {
      console.log(` ❌ Failed: ${err instanceof Error ? err.message : String(err)}`);
      // Still add to index with remote URL for proxy fallback
      index.push({
        id: row.id,
        title: row.title,
        filename,
        originalUrl: row.video_url || undefined,
        thumbnailUrl: row.thumbnail_url || undefined,
        duration: row.duration || undefined,
      });
      failed++;
    }
  }

  // Write the index file
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2));

  console.log(`
╔═══════════════════════════════════╗
║  📊  Sync Complete                ║
║───────────────────────────────────║
║  Total:      ${String(rows.length).padEnd(20)}║
║  Downloaded: ${String(downloaded).padEnd(20)}║
║  Skipped:    ${String(skipped).padEnd(20)}║
║  Failed:     ${String(failed).padEnd(20)}║
╚═══════════════════════════════════╝

Next steps:
  1. Start the video server:  bun run video:server
  2. Open demo player:        http://localhost:4000
  3. Play in VLC:             Ctrl+N → http://localhost:4000/stream/<id>
`);

  await pool.end();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

main().catch(err => {
  console.error("❌ Sync failed:", err);
  process.exit(1);
});
