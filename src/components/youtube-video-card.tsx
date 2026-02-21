"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Download, Loader2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
  return `${count} views`;
}

function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const h = parseInt(match[1] || "0");
  const m = parseInt(match[2] || "0");
  const s = parseInt(match[3] || "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface YouTubeVideoProps {
  video: {
    id: string;
    title: string;
    thumbnailURL: string;
    channelTitle: string;
    channelThumbnail?: string;
    publishedAt: string;
    viewCount: number;
    duration: string;
    tags?: string[];
  };
}

export function YouTubeVideoCard({ video }: YouTubeVideoProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isDownloading) return;
      setIsDownloading(true);
      toast.info("Starting download…");

      try {
        const res = await fetch(`/api/download/yt?v=${video.id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Download failed");
        }

        // Read full response as blob, then trigger native save-to-Downloads
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const filenameMatch = disposition.match(/filename="?(.+?)"?$/);
        const filename = filenameMatch?.[1] ?? `${video.title.replace(/[^\w\s-]/g, "")}.mp4`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        toast.success("Download complete!");
      } catch (err: unknown) {
        console.error("[yt-download]", err);
        toast.error(err instanceof Error ? err.message : "Download failed");
      } finally {
        setIsDownloading(false);
      }
    },
    [video.id, video.title, isDownloading]
  );

  return (
    <div className="group relative">
      {/* Three-dot menu with Download */}
      <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-7 w-7 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-black/70 transition-colors">
              <MoreVertical className="h-3.5 w-3.5 text-white" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isDownloading ? "Downloading…" : "Download"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Link href={`/watch/yt/${video.id}`}>
        {/* Thumbnail — locked to 16:9 */}
        <div className="relative w-full rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '16/9' }}>
          <Image
            src={video.thumbnailURL}
            alt={video.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {/* Duration badge */}
          <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
            {parseDuration(video.duration)}
          </div>
          {/* NepTube indicator */}
          <div className="absolute top-1.5 left-1.5 bg-red-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
            <ExternalLink className="h-2.5 w-2.5" />
            NepTube
          </div>
        </div>

        {/* Info — YouTube style: avatar left, text right */}
        <div className="flex gap-2">
          {/* Circular channel avatar */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
              {video.channelThumbnail ? (
                <Image
                  src={video.channelThumbnail}
                  alt={video.channelTitle}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-red-500/10 text-red-500 text-xs font-semibold">
                  {video.channelTitle[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Title and meta */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[13px] line-clamp-2 leading-snug group-hover:text-primary transition-colors">
              {video.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{video.channelTitle}</p>
            <p className="text-xs text-muted-foreground leading-tight">
              {formatViewCount(video.viewCount)} · {formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}

export function YouTubeVideoCardSkeleton() {
  return (
    <div>
      <div className="w-full rounded-xl mb-3" style={{ aspectRatio: '16/9' }}>
        <div className="w-full h-full bg-muted animate-pulse rounded-xl" />
      </div>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-full bg-muted animate-pulse rounded" />
          <div className="h-3.5 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
