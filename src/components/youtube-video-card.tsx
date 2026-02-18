"use client";

import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  return (
    <Link href={`/watch/yt/${video.id}`} className="group">
      <div className="glass-card gradient-border rounded-xl overflow-hidden">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-muted overflow-hidden thumbnail-hover">
          <Image
            src={video.thumbnailURL}
            alt={video.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
          {/* Duration badge */}
          <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
            {parseDuration(video.duration)}
          </div>
          {/* YouTube indicator */}
          <div className="absolute top-1.5 left-1.5 bg-red-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
            <ExternalLink className="h-2.5 w-2.5" />
            YouTube
          </div>
        </div>

        {/* Info */}
        <div className="p-3.5">
          <div className="flex gap-3">
            {/* Channel avatar */}
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted">
                {video.channelThumbnail ? (
                  <Image
                    src={video.channelThumbnail}
                    alt={video.channelTitle}
                    width={32}
                    height={32}
                    className="object-cover"
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
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {video.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5">{video.channelTitle}</p>
              <p className="text-xs text-muted-foreground">
                {formatViewCount(video.viewCount)} · {formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true })}
              </p>
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {video.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 rounded bg-red-500/5 text-red-500/70 border border-red-500/10"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function YouTubeVideoCardSkeleton() {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="aspect-video bg-muted animate-pulse" />
      <div className="p-3.5">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
