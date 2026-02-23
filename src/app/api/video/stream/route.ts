import { NextRequest, NextResponse } from "next/server";

/**
 * Byte-range streaming proxy for videos.
 * 
 * Instead of the browser downloading the entire video file before playback,
 * this endpoint fetches only the requested byte range from the origin CDN,
 * enabling instant playback and smooth seeking.
 * 
 * Usage: /api/video/stream?url=<encoded-video-url>
 */

const CHUNK_SIZE = 1024 * 1024; // 1MB default chunk

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get("url");

  if (!videoUrl) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
  }

  // Validate URL to prevent SSRF - only allow known video CDNs
  const allowedHosts = [
    "utfs.io",
    "ufs.sh",
    "uploadthing.com",
    "images.pexels.com",
    "videos.pexels.com",
    "player.vimeo.com",
    "vod-progressive.akamaized.net",
  ];

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(videoUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const isAllowed = allowedHosts.some(
    (host) => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`)
  );

  if (!isAllowed) {
    return NextResponse.json(
      { error: "URL host not allowed" },
      { status: 403 }
    );
  }

  try {
    const rangeHeader = request.headers.get("range");

    // If no range requested, do a HEAD request first to get content-length
    if (!rangeHeader) {
      const headRes = await fetch(videoUrl, { method: "HEAD" });
      const contentLength = headRes.headers.get("content-length");
      const contentType = headRes.headers.get("content-type") || "video/mp4";
      const totalSize = contentLength ? parseInt(contentLength, 10) : 0;

      if (totalSize === 0) {
        // Fallback: stream the whole thing
        const fullRes = await fetch(videoUrl);
        return new NextResponse(fullRes.body, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400, immutable",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      // Return first chunk to start instant playback
      const end = Math.min(CHUNK_SIZE - 1, totalSize - 1);
      const rangeRes = await fetch(videoUrl, {
        headers: { Range: `bytes=0-${end}` },
      });

      return new NextResponse(rangeRes.body, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Range": `bytes 0-${end}/${totalSize}`,
          "Content-Length": String(end + 1),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=86400, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Parse the range header: "bytes=START-END"
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      return NextResponse.json({ error: "Invalid range header" }, { status: 416 });
    }

    const start = parseInt(match[1], 10);
    const requestedEnd = match[2] ? parseInt(match[2], 10) : undefined;

    // Fetch the range from the origin
    const originRange = requestedEnd !== undefined
      ? `bytes=${start}-${requestedEnd}`
      : `bytes=${start}-${start + CHUNK_SIZE - 1}`;

    const rangeRes = await fetch(videoUrl, {
      headers: { Range: originRange },
    });

    // Forward the response
    const contentRange = rangeRes.headers.get("content-range");
    const contentType = rangeRes.headers.get("content-type") || "video/mp4";
    const contentLength = rangeRes.headers.get("content-length");

    const resHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400, immutable",
      "Access-Control-Allow-Origin": "*",
    };

    if (contentRange) resHeaders["Content-Range"] = contentRange;
    if (contentLength) resHeaders["Content-Length"] = contentLength;

    return new NextResponse(rangeRes.body, {
      status: rangeRes.status === 206 ? 206 : 200,
      headers: resHeaders,
    });
  } catch (err) {
    console.error("Video stream proxy error:", err);
    return NextResponse.json(
      { error: "Failed to stream video" },
      { status: 500 }
    );
  }
}
