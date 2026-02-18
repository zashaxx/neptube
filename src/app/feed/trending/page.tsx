"use client";

import { Suspense } from "react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Flame, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { YouTubeVideoCard, YouTubeVideoCardSkeleton } from "@/components/youtube-video-card";

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
  return `${count} views`;
}

function TrendingFeed() {
  const { data, isLoading } = trpc.videos.getTrending.useQuery({ limit: 20 });
  const { data: ytConfigured } = trpc.youtube.isConfigured.useQuery();
  const { data: ytTrending, isLoading: ytLoading } = trpc.youtube.trending.useQuery(
    { maxResults: 12 },
    { enabled: !!ytConfigured?.configured }
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <Skeleton className="aspect-video" />
              <div className="p-3.5"><div className="flex gap-3"><Skeleton className="w-8 h-8 rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-24" /></div></div></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div className="w-20 h-20 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
          <Flame className="h-10 w-10 text-orange-500/60" />
        </div>
        <h2 className="text-lg font-semibold mb-1">Nothing trending yet</h2>
        <p className="text-muted-foreground text-sm">
          Videos will appear here as they gain traction.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          <span className="gradient-text">Trending</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Most popular videos right now
        </p>
      </div>

      <div className="space-y-4">
        {data.map((video, index) => (
          <Link
            key={video.id}
            href={`/feed/${video.id}`}
            className="group flex gap-4 p-3 rounded-xl glass-card gradient-border transition-all"
          >
            {/* Rank number */}
            <div className="flex items-center justify-center w-10 flex-shrink-0">
              <span
                className={`text-2xl font-bold ${
                  index < 3 ? "text-orange-500" : "text-muted-foreground"
                }`}
              >
                {index + 1}
              </span>
            </div>

            {/* Thumbnail */}
            <div className="relative w-44 aspect-video bg-muted rounded-lg overflow-hidden flex-shrink-0">
              {video.isNsfw && (
                <div className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center">
                  <span className="text-red-400 text-xs">NSFW</span>
                </div>
              )}
              {video.thumbnailURL ? (
                <Image
                  src={video.thumbnailURL}
                  alt={video.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <span className="text-primary text-xl font-bold">
                    {video.title[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 py-1">
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {video.title}
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-5 h-5 rounded overflow-hidden bg-muted flex-shrink-0">
                  {video.user.imageURL && (
                    <Image
                      src={video.user.imageURL}
                      alt={video.user.name}
                      width={20}
                      height={20}
                      className="object-cover"
                    />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {video.user.name}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatViewCount(video.viewCount)} ·{" "}
                {formatDistanceToNow(new Date(video.createdAt), {
                  addSuffix: true,
                })}
              </p>
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {video.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 rounded"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* YouTube Trending Section */}
      {ytConfigured?.configured && (ytTrending?.videos?.length ?? 0) > 0 && (
        <div className="mt-8 pt-6 border-t border-border/50">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
              <ExternalLink className="h-3.5 w-3.5 text-white" />
            </div>
            <h2 className="text-lg font-bold">Trending on YouTube</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
            {ytTrending!.videos.map((video) => (
              <div key={video.id} className="card-animate">
                <YouTubeVideoCard video={video} />
              </div>
            ))}
          </div>
        </div>
      )}
      {ytConfigured?.configured && ytLoading && (
        <div className="mt-8 pt-6 border-t border-border/50">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
              <ExternalLink className="h-3.5 w-3.5 text-white" />
            </div>
            <h2 className="text-lg font-bold">Trending on YouTube</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <YouTubeVideoCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrendingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <Skeleton className="h-8 w-48 mb-6" />
        </div>
      }
    >
      <TrendingFeed />
    </Suspense>
  );
}
