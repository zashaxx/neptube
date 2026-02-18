"use client";

import { Suspense, useEffect, useRef, useCallback, useState } from "react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Eye, Upload, Search, Loader2, Sparkles, TrendingUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@clerk/nextjs";
import { YouTubeVideoCard, YouTubeVideoCardSkeleton } from "@/components/youtube-video-card";

function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K views`;
  }
  return `${count} views`;
}

function VideoCard({ video }: { video: {
  id: string;
  title: string;
  thumbnailURL: string | null;
  viewCount: number;
  createdAt: Date | string;
  tags: string[] | null;
  isNsfw: boolean | null;
  user: {
    id: string;
    name: string;
    imageURL: string;
  };
}}) {
  return (
    <Link href={`/feed/${video.id}`} className="group">
      <div className="glass-card gradient-border rounded-xl overflow-hidden">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-muted overflow-hidden thumbnail-hover">
          {video.isNsfw && (
            <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-xl flex items-center justify-center">
              <span className="text-red-400 text-xs font-medium">NSFW</span>
            </div>
          )}
          {video.thumbnailURL ? (
            <Image
              src={video.thumbnailURL}
              alt={video.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="text-primary text-3xl font-bold">
                {video.title[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="p-3.5">
          <div className="flex gap-3">
            {/* Channel avatar */}
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted">
                {video.user.imageURL ? (
                  <Image
                    src={video.user.imageURL}
                    alt={video.user.name}
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-semibold">
                    {video.user.name[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            
            {/* Title and meta */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {video.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5">{video.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatViewCount(video.viewCount)} · {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
              </p>
              {/* Tags */}
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {video.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 rounded bg-primary/5 text-primary/70 border border-primary/10"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {video.tags.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{video.tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function VideoCardSkeleton() {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <Skeleton className="aspect-video" />
      <div className="p-3.5">
        <div className="flex gap-3">
          <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [feedMode, setFeedMode] = useState<"explore" | "foryou">("explore");
  const { isSignedIn } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.videos.getFeed.useInfiniteQuery(
      { limit: 20, search: searchQuery || undefined },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: feedMode === "explore",
      }
    );

  const { data: personalizedData, isLoading: isPersonalizedLoading } =
    trpc.videos.getPersonalizedFeed.useQuery(
      { limit: 30 },
      { enabled: feedMode === "foryou" && !!isSignedIn && !searchQuery }
    );

  // YouTube integration — fetch trending or search results
  const { data: ytConfigured } = trpc.youtube.isConfigured.useQuery();
  const { data: ytTrending, isLoading: ytTrendingLoading } = trpc.youtube.trending.useQuery(
    { maxResults: 8 },
    { enabled: !!ytConfigured?.configured && !searchQuery && feedMode === "explore" }
  );
  const { data: ytSearch, isLoading: ytSearchLoading } = trpc.youtube.search.useQuery(
    { query: searchQuery, maxResults: 8 },
    { enabled: !!ytConfigured?.configured && !!searchQuery }
  );
  const ytVideos = searchQuery ? (ytSearch?.videos ?? []) : (ytTrending?.videos ?? []);
  const ytLoading = searchQuery ? ytSearchLoading : ytTrendingLoading;

  // Intersection observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: "200px",
    });
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  const allVideos = data?.pages.flatMap((page) => page.items) ?? [];

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading videos</p>
          <p className="text-gray-500 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {searchQuery ? (
            <>Results for <span className="gradient-text">&quot;{searchQuery}&quot;</span></>
          ) : (
            <span className="gradient-text">
              {feedMode === "foryou" ? "For You" : "Explore"}
            </span>
          )}
        </h1>

        {/* Feed Mode Tabs */}
        {!searchQuery && isSignedIn && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setFeedMode("explore")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                feedMode === "explore"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Explore
            </button>
            <button
              onClick={() => setFeedMode("foryou")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                feedMode === "foryou"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              For You
            </button>
          </div>
        )}
      </div>

      {/* Personalized Feed */}
      {feedMode === "foryou" && !searchQuery && isSignedIn ? (
        isPersonalizedLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : personalizedData && personalizedData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
            {personalizedData.map((video) => (
              <div key={video.id} className="card-animate">
                <VideoCard video={video} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-10 w-10 text-primary/60" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No personalized suggestions yet</h2>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm">
              Watch some videos first so we can learn your preferences!
            </p>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setFeedMode("explore")}
            >
              <TrendingUp className="h-4 w-4" />
              Browse Explore
            </Button>
          </div>
        )
      ) : (
      /* Regular Feed */
      isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : allVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            {searchQuery ? (
              <Search className="h-10 w-10 text-primary/60" />
            ) : (
              <Eye className="h-10 w-10 text-primary/60" />
            )}
          </div>
          <h2 className="text-lg font-semibold mb-1">
            {searchQuery ? "Nothing found" : "No videos yet"}
          </h2>
          <p className="text-muted-foreground text-sm mb-4 max-w-sm">
            {searchQuery
              ? `No videos match "${searchQuery}". Try a different search.`
              : "Be the first to share something with the community."}
          </p>
          {!searchQuery && (
            <Link href="/studio/upload">
              <Button className="gap-2 gradient-btn rounded-lg px-5 py-2 font-medium shadow-lg">
                <Upload className="h-4 w-4" />
                Upload Video
              </Button>
            </Link>
          )}

          {/* Show YouTube videos even when local is empty */}
          {ytConfigured?.configured && ytVideos.length > 0 && (
            <div className="mt-8 w-full max-w-7xl text-left">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
                  <ExternalLink className="h-3.5 w-3.5 text-white" />
                </div>
                <h2 className="text-lg font-bold">
                  {searchQuery ? "YouTube Results" : "Trending on YouTube"}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
                {ytVideos.map((video) => (
                  <div key={video.id} className="card-animate">
                    <YouTubeVideoCard video={video} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
            {allVideos.map((video) => (
              <div key={video.id} className="card-animate">
                <VideoCard video={video} />
              </div>
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {isFetchingNextPage && (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            )}
          </div>

          {/* YouTube Section */}
          {ytConfigured?.configured && ytVideos.length > 0 && (
            <div className="mt-4 pt-6 border-t border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
                    <ExternalLink className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="text-lg font-bold">
                    {searchQuery ? (
                      <>YouTube results for <span className="text-red-500">&quot;{searchQuery}&quot;</span></>
                    ) : (
                      <span>Trending on YouTube</span>
                    )}
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
                {ytVideos.map((video) => (
                  <div key={video.id} className="card-animate">
                    <YouTubeVideoCard video={video} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {ytConfigured?.configured && ytLoading && (
            <div className="mt-4 pt-6 border-t border-border/50">
              <div className="flex items-center gap-2 mb-4">
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
        </>
      ))}
    </div>
  );
}

export default function FeedPageWrapper() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <Skeleton className="h-8 w-40 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      </div>
    }>
      <FeedPage />
    </Suspense>
  );
}