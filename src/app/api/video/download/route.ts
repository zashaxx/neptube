import { NextRequest, NextResponse } from "next/server";

/**
 * Video download proxy.
 * 
 * Fetches the full video from the origin CDN and serves it with
 * Content-Disposition: attachment so the browser saves it as a file.
 * This allows users to download videos and play them in external
 * players like VLC, Windows Media Player, etc.
 * 
 * Usage: /api/video/download?url=<encoded-video-url>&title=<encoded-title>
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get("url");
  const title = searchParams.get("title") || "video";

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
    const response = await fetch(videoUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch video: ${response.status}` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "video/mp4";
    const contentLength = response.headers.get("content-length");

    // Determine file extension from content type
    const extMap: Record<string, string> = {
      "video/mp4": ".mp4",
      "video/webm": ".webm",
      "video/ogg": ".ogv",
      "video/quicktime": ".mov",
      "video/x-msvideo": ".avi",
      "video/x-matroska": ".mkv",
    };
    const ext = extMap[contentType] || ".mp4";

    // Sanitize title for filename
    const safeTitle = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim() || "video";
    const filename = `${safeTitle}${ext}`;

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    };

    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("Video download proxy error:", err);
    return NextResponse.json(
      { error: "Failed to download video" },
      { status: 500 }
    );
  }
}
