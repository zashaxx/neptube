/**
 * NepTube Video Server — Dedicated static video streaming server
 * 
 * A lightweight Bun HTTP server that runs separately from Next.js,
 * optimized purely for serving video files with:
 *  - Proper HTTP Range requests (seeking, chunked delivery)
 *  - CORS headers (any origin)
 *  - Video file caching
 *  - Local file serving from ./videos folder
 *  - CDN proxy for remote videos
 * 
 * Usage:
 *   bun run video-server/server.ts
 * 
 * Then open http://localhost:4000 for the demo player,
 * or use any external player (VLC, mpv, PotPlayer) with:
 *   http://localhost:4000/stream/<videoId>
 */

import { readdir, stat, mkdir } from "fs/promises";
import { join, extname } from "path";

const PORT = 4000;
const VIDEOS_DIR = join(import.meta.dir, "videos");
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

// Video metadata index (loaded from videos.json)
interface VideoMeta {
  id: string;
  title: string;
  filename: string;       // local filename in ./videos/
  originalUrl?: string;   // remote CDN URL (for proxy fallback)
  thumbnailUrl?: string;
  duration?: number;
  size?: number;
}

let videoIndex: VideoMeta[] = [];

// Load video index
async function loadVideoIndex() {
  try {
    const indexPath = join(import.meta.dir, "videos.json");
    const file = Bun.file(indexPath);
    if (await file.exists()) {
      videoIndex = await file.json();
      console.log(`📋 Loaded ${videoIndex.length} videos from index`);
    }
  } catch {
    console.log("📋 No videos.json found — will scan ./videos/ folder");
  }

  // Also scan the videos directory for any .mp4/.webm files not in index
  try {
    await mkdir(VIDEOS_DIR, { recursive: true });
    const files = await readdir(VIDEOS_DIR);
    const videoFiles = files.filter(f => 
      [".mp4", ".webm", ".mkv", ".mov", ".avi"].includes(extname(f).toLowerCase())
    );

    for (const file of videoFiles) {
      const existing = videoIndex.find(v => v.filename === file);
      if (!existing) {
        const fileStat = await stat(join(VIDEOS_DIR, file));
        videoIndex.push({
          id: file.replace(/\.[^.]+$/, ""),
          title: file.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          filename: file,
          size: fileStat.size,
        });
      }
    }

    console.log(`📁 ${videoFiles.length} video files in ./videos/`);
  } catch {
    await mkdir(VIDEOS_DIR, { recursive: true });
    console.log("📁 Created empty ./videos/ directory");
  }
}

// MIME types for video files
function getVideoMime(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const mimes: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".ogv": "video/ogg",
  };
  return mimes[ext] || "video/mp4";
}

// Serve a local video file with range support
async function serveLocalVideo(filePath: string, request: Request): Promise<Response> {
  const file = Bun.file(filePath);
  const fileSize = file.size;
  const contentType = getVideoMime(filePath);

  const rangeHeader = request.headers.get("range");

  if (!rangeHeader) {
    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Parse range
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) {
    return new Response("Invalid Range", { status: 416 });
  }

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : Math.min(start + CHUNK_SIZE - 1, fileSize - 1);
  const chunkSize = end - start + 1;

  return new Response(file.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Content-Length": String(chunkSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Proxy a remote video URL with range support
async function proxyRemoteVideo(url: string, request: Request): Promise<Response> {
  const headers: Record<string, string> = {};
  const rangeHeader = request.headers.get("range");
  if (rangeHeader) headers["Range"] = rangeHeader;

  const response = await fetch(url, { headers });

  const resHeaders: Record<string, string> = {
    "Content-Type": response.headers.get("content-type") || "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400",
    "Access-Control-Allow-Origin": "*",
  };

  const contentRange = response.headers.get("content-range");
  const contentLength = response.headers.get("content-length");
  if (contentRange) resHeaders["Content-Range"] = contentRange;
  if (contentLength) resHeaders["Content-Length"] = contentLength;

  return new Response(response.body, {
    status: response.status,
    headers: resHeaders,
  });
}

// Generate the demo player HTML
function getDemoPlayerHTML(autoPlayId?: string): string {
  const videoListItems = videoIndex.map((v) => `
    <div class="video-card" data-id="${v.id}" data-title="${v.title.replace(/"/g, '&quot;')}" onclick="playVideo('${v.id}', '${v.title.replace(/'/g, "\\'")}'  , this)">
      <div class="thumb">
        ${v.thumbnailUrl ? `<img src="${v.thumbnailUrl}" alt="${v.title}" loading="lazy" />` : `<div class="thumb-placeholder">▶</div>`}
      </div>
      <div class="info">
        <div class="video-title">${v.title}</div>
        <div class="video-meta">${v.size ? formatBytes(v.size) : "Remote"} ${v.duration ? `· ${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, "0")}` : ""}</div>
      </div>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NepTube Video Player</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: #0f0f0f; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; flex-direction: column; height: 100vh;
    }
    header {
      background: #1a1a2e; padding: 12px 24px; display: flex; align-items: center; gap: 12px;
      border-bottom: 1px solid #333;
    }
    header h1 { font-size: 20px; color: #e74c3c; font-weight: 700; }
    header span { color: #888; font-size: 13px; }
    .container { display: flex; flex: 1; overflow: hidden; }
    .player-area { flex: 1; display: flex; flex-direction: column; padding: 16px; overflow-y: auto; }
    video {
      width: 100%; max-height: 70vh; background: #000; border-radius: 8px;
      outline: none;
    }
    .now-playing {
      padding: 12px 0; font-size: 18px; font-weight: 600;
    }
    .player-actions {
      display: flex; gap: 8px; padding: 8px 0; flex-wrap: wrap;
    }
    .player-actions button {
      background: #2a2a3e; border: 1px solid #444; color: #fff; padding: 8px 16px;
      border-radius: 6px; cursor: pointer; font-size: 13px; transition: background 0.2s;
    }
    .player-actions button:hover { background: #3a3a5e; }
    .sidebar {
      width: 340px; border-left: 1px solid #333; overflow-y: auto; padding: 8px;
      background: #151520;
    }
    .sidebar h2 { font-size: 14px; color: #aaa; padding: 8px 8px 12px; text-transform: uppercase; letter-spacing: 1px; }
    .video-card {
      display: flex; gap: 10px; padding: 8px; border-radius: 6px; cursor: pointer;
      transition: background 0.2s; border: 1px solid transparent;
    }
    .video-card:hover { background: #2a2a3e; }
    .video-card.active { background: #2a2a4e; border-color: #e74c3c; }
    .thumb { width: 120px; height: 68px; border-radius: 4px; overflow: hidden; flex-shrink: 0; background: #222; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .thumb-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #555; }
    .info { flex: 1; min-width: 0; }
    .video-title { font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .video-meta { font-size: 11px; color: #888; margin-top: 4px; }
    .empty-state { text-align: center; padding: 40px 20px; color: #666; }
    .empty-state h3 { font-size: 18px; margin-bottom: 12px; }
    .empty-state code { background: #222; padding: 2px 8px; border-radius: 4px; font-size: 13px; }
    .vlc-hint { background: #1a1a2e; border: 1px solid #333; border-radius: 8px; padding: 12px 16px; margin-top: 8px; font-size: 13px; color: #aaa; }
    .vlc-hint strong { color: #e74c3c; }
    @media (max-width: 768px) {
      .container { flex-direction: column; }
      .sidebar { width: 100%; max-height: 200px; border-left: none; border-top: 1px solid #333; }
    }
  </style>
</head>
<body>
  <header>
    <h1>🎬 NepTube Player</h1>
    <span>Dedicated Video Server · Port ${PORT} · ${videoIndex.length} videos</span>
  </header>
  <div class="container">
    <div class="player-area">
      <video id="player" controls autoplay>
        Your browser does not support the video tag.
      </video>
      <div class="now-playing" id="now-playing">Select a video to play</div>
      <div class="player-actions">
        <button onclick="copyStreamUrl()">📋 Copy Stream URL</button>
        <button onclick="openInVlc()">🎬 Copy for VLC</button>
        <button onclick="downloadCurrent()">💾 Download</button>
        <button onclick="toggleFullscreen()">⛶ Fullscreen</button>
      </div>
      <div class="vlc-hint">
        <strong>Play in VLC:</strong> Click "Copy for VLC" → Open VLC → Ctrl+N → Paste → Play<br/>
        <strong>Play in mpv:</strong> Run <code>mpv http://localhost:${PORT}/stream/VIDEO_ID</code>
      </div>
    </div>
    <div class="sidebar">
      <h2>Videos (${videoIndex.length})</h2>
      ${videoIndex.length > 0 ? videoListItems : `
        <div class="empty-state">
          <h3>No videos yet</h3>
          <p>Run the sync script to download videos:</p>
          <p style="margin-top:8px"><code>bun run video:sync</code></p>
        </div>
      `}
    </div>
  </div>

  <script>
    const player = document.getElementById("player");
    const nowPlaying = document.getElementById("now-playing");
    let currentId = "";
    let currentTitle = "";

    function playVideo(id, title, cardEl) {
      currentId = id;
      currentTitle = title;
      player.src = "/stream/" + id;
      player.load();
      player.play().catch(() => {});
      nowPlaying.textContent = title;
      
      // Highlight active card
      document.querySelectorAll(".video-card").forEach(c => c.classList.remove("active"));
      if (cardEl) cardEl.classList.add("active");
    }

    function copyStreamUrl() {
      if (!currentId) return alert("No video selected");
      const url = location.origin + "/stream/" + currentId;
      navigator.clipboard.writeText(url);
      alert("Copied: " + url + "\\n\\nPaste into VLC (Ctrl+N), mpv, or any player.");
    }

    function openInVlc() {
      if (!currentId) return alert("No video selected");
      const url = location.origin + "/stream/" + currentId;
      navigator.clipboard.writeText(url);
      alert("Stream URL copied!\\n\\n1. Open VLC\\n2. Press Ctrl+N (Media → Open Network Stream)\\n3. Paste the URL\\n4. Click Play");
    }

    function downloadCurrent() {
      if (!currentId) return alert("No video selected");
      const a = document.createElement("a");
      a.href = "/download/" + currentId;
      a.download = (currentTitle || "video") + ".mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    function toggleFullscreen() {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        player.requestFullscreen();
      }
    }

    // On load: check URL for ?play=<id> parameter, or auto-play first video
    (function init() {
      const params = new URLSearchParams(window.location.search);
      const playId = params.get("play");

      if (playId) {
        const card = document.querySelector('.video-card[data-id="' + playId + '"]');
        if (card) {
          const title = card.getAttribute("data-title") || "Video";
          playVideo(playId, title, card);
          card.scrollIntoView({ block: "center", behavior: "smooth" });
          return;
        }
        // Even if no card found (not synced yet), try to stream it directly
        playVideo(playId, "Video", null);
        return;
      }

      // Auto-play first video in the list
      const firstCard = document.querySelector(".video-card");
      if (firstCard) {
        const id = firstCard.getAttribute("data-id");
        const title = firstCard.getAttribute("data-title") || "Video";
        if (id) playVideo(id, title, firstCard);
      }
    })();
  </script>
</body>
</html>`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// ─── Start Server ───────────────────────────────────────────────────

await loadVideoIndex();

Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Range",
        },
      });
    }

    // ─── Home: Demo Player ───
    if (path === "/" || path === "/player") {
      const autoPlayId = url.searchParams.get("play") || undefined;
      return new Response(getDemoPlayerHTML(autoPlayId), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // ─── API: List videos ───
    if (path === "/api/videos") {
      return Response.json(videoIndex.map(v => ({
        id: v.id,
        title: v.title,
        streamUrl: `http://localhost:${PORT}/stream/${v.id}`,
        downloadUrl: `http://localhost:${PORT}/download/${v.id}`,
        thumbnail: v.thumbnailUrl,
        size: v.size,
        duration: v.duration,
      })));
    }

    // ─── Stream video (with range support) ───
    if (path.startsWith("/stream/")) {
      const videoId = path.replace("/stream/", "");
      const meta = videoIndex.find(v => v.id === videoId);

      if (!meta) {
        return Response.json({ error: "Video not found" }, { status: 404 });
      }

      // Try local file first
      const localPath = join(VIDEOS_DIR, meta.filename);
      const localFile = Bun.file(localPath);
      if (await localFile.exists()) {
        return serveLocalVideo(localPath, request);
      }

      // Fall back to remote proxy
      if (meta.originalUrl) {
        return proxyRemoteVideo(meta.originalUrl, request);
      }

      return Response.json({ error: "Video file not available" }, { status: 404 });
    }

    // ─── Download video ───
    if (path.startsWith("/download/")) {
      const videoId = path.replace("/download/", "");
      const meta = videoIndex.find(v => v.id === videoId);

      if (!meta) {
        return Response.json({ error: "Video not found" }, { status: 404 });
      }

      const localPath = join(VIDEOS_DIR, meta.filename);
      const localFile = Bun.file(localPath);
      const safeTitle = meta.title.replace(/[<>:"/\\|?*]/g, "_");

      if (await localFile.exists()) {
        return new Response(localFile, {
          headers: {
            "Content-Type": getVideoMime(meta.filename),
            "Content-Disposition": `attachment; filename="${safeTitle}.mp4"`,
            "Content-Length": String(localFile.size),
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      // Proxy download from CDN
      if (meta.originalUrl) {
        const res = await fetch(meta.originalUrl);
        return new Response(res.body, {
          headers: {
            "Content-Type": res.headers.get("content-type") || "video/mp4",
            "Content-Disposition": `attachment; filename="${safeTitle}.mp4"`,
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      return Response.json({ error: "Video file not available" }, { status: 404 });
    }

    // ─── Register a new video (called by NepTube after upload) ───
    if (path === "/api/register" && request.method === "POST") {
      try {
        const body = await request.json() as {
          id: string;
          title: string;
          videoUrl?: string;
          thumbnailUrl?: string;
          duration?: number;
        };

        if (!body.id || !body.title) {
          return Response.json({ error: "id and title are required" }, { status: 400 });
        }

        // Skip if already registered
        const existing = videoIndex.find(v => v.id === body.id);
        if (existing) {
          return Response.json({ ok: true, message: "Already registered", videos: videoIndex.length });
        }

        const safeName = body.title
          .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
          .replace(/\s+/g, "_")
          .replace(/_+/g, "_")
          .substring(0, 100)
          .trim();

        const newEntry: VideoMeta = {
          id: body.id,
          title: body.title,
          filename: `${safeName}.mp4`,
          originalUrl: body.videoUrl || undefined,
          thumbnailUrl: body.thumbnailUrl || undefined,
          duration: body.duration || undefined,
        };

        videoIndex.push(newEntry);

        // Persist to videos.json
        const indexPath = join(import.meta.dir, "videos.json");
        await Bun.write(indexPath, JSON.stringify(videoIndex, null, 2));

        console.log(`✅ Registered new video: ${body.title} (${body.id})`);
        return Response.json({ ok: true, videos: videoIndex.length });
      } catch (err) {
        console.error("❌ Failed to register video:", err);
        return Response.json({ error: "Invalid request body" }, { status: 400 });
      }
    }

    // ─── Reload index ───
    if (path === "/reload") {
      await loadVideoIndex();
      return Response.json({ ok: true, videos: videoIndex.length });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
});

console.log(`
╔══════════════════════════════════════════════════════════╗
║  🎬  NepTube Video Server                               ║
║──────────────────────────────────────────────────────────║
║  Demo Player:    http://localhost:${PORT}                   ║
║  Video API:      http://localhost:${PORT}/api/videos        ║
║  Stream Video:   http://localhost:${PORT}/stream/<id>       ║
║  Download Video: http://localhost:${PORT}/download/<id>     ║
║──────────────────────────────────────────────────────────║
║  Videos loaded: ${String(videoIndex.length).padEnd(40)}║
║  Videos folder: ./video-server/videos/                   ║
║                                                          ║
║  🎬 Play in VLC:  Ctrl+N → paste stream URL             ║
║  📟 Play in mpv:  mpv http://localhost:${PORT}/stream/<id>  ║
╚══════════════════════════════════════════════════════════╝
`);
