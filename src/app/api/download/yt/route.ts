import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

/**
 * GET /api/download/yt?v=VIDEO_ID
 *
 * Streams a YouTube video with Content-Disposition: attachment so
 * the browser saves it directly to the user's Downloads folder.
 */
export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("v");

  if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // Get video info to build a safe filename
    const info = await ytdl.getInfo(url);
    const rawTitle = info.videoDetails.title.replace(/[^\w\s-]/g, "").trim() || "video";
    const safeTitle = rawTitle.replace(/\s+/g, "_").substring(0, 100);

    // Pick the best format with both video + audio (progressive), preferring mp4
    const format = ytdl.chooseFormat(info.formats, {
      quality: "highest",
      filter: "videoandaudio",
    });

    const contentType = format.mimeType?.split(";")[0] ?? "video/mp4";
    const ext = contentType.includes("webm") ? "webm" : "mp4";

    // Stream the video to the client with attachment headers
    const stream = ytdl.downloadFromInfo(info, { format });

    // Convert Node readable stream → Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });

    return new Response(webStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeTitle}.${ext}"`,
        ...(format.contentLength
          ? { "Content-Length": format.contentLength }
          : {}),
      },
    });
  } catch (err: unknown) {
    console.error("[yt-download]", err);
    const message =
      err instanceof Error ? err.message : "Failed to download video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
