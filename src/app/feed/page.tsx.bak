"use client";

import { Suspense, useEffect, useRef, useCallback, useState } from "react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Eye, Upload, Search, Loader2, Sparkles, TrendingUp, Play, ChevronLeft, ChevronRight, MoreVertical, EyeOff, Ban, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@clerk/nextjs";
import { YouTubeVideoCard, YouTubeVideoCardSkeleton } from "@/components/youtube-video-card";
import { toast } from "sonner";

function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K views`;
  }
  return `${count} views`;
}

function VideoCard({ video, onDismiss }: { video: {
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
}; onDismiss?: (videoId: string) => void }) {
  return (
    <div className="relative group">
    {/* 3-dot menu */}
    {onDismiss && (
      <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-7 w-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors">
              <MoreVertical className="h-3.5 w-3.5 text-white" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDismiss(video.id); }}>
              <EyeOff className="h-4 w-4 mr-2" />
              Not interested
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDismiss(video.id); }}>
              <Ban className="h-4 w-4 mr-2" />
              Don&apos;t recommend channel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )}
    <Link href={`/feed/${video.id}`}>
      {/* Thumbnail — locked to 16:9 */}
      <div className="relative w-full rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '16/9' }}>
        {video.isNsfw && (
          <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-xl flex items-center justify-center">
            <span className="text-red-400 text-[10px] font-medium">NSFW</span>
          </div>
        )}
        {video.thumbnailURL ? (
          <Image
            src={video.thumbnailURL}
            alt={video.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-muted-foreground text-lg font-bold">
              {video.title[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Info — YouTube style: avatar left, text right */}
      <div className="flex gap-2">
        {/* Circular channel avatar */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
            {video.user.imageURL ? (
              <Image
                src={video.user.imageURL}
                alt={video.user.name}
                width={32}
                height={32}
                className="object-cover w-full h-full"
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
          <h3 className="font-medium text-[13px] line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 hover:text-foreground transition-colors truncate">
            {video.user.name}
          </p>
          <p className="text-xs text-muted-foreground leading-tight">
            {formatViewCount(video.viewCount)} · {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Link>
    </div>
  );
}

function VideoCardSkeleton() {
  return (
    <div>
      <div className="w-full rounded-xl mb-3" style={{ aspectRatio: '16/9' }}>
        <Skeleton className="w-full h-full rounded-xl" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

function ShortsRow({ shorts }: { shorts: { id: string; title: string; thumbnailURL: string | null; viewCount: number; duration: number | null; user: { name: string } }[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll);
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll, shorts.length]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  if (shorts.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <Link href="/shorts" className="flex items-center gap-2 group">
          <Image src="/logo.svg" width={28} height={28} alt="NepTube" />
          <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">Shorts</h2>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {canScrollLeft && (
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => scroll("left")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {canScrollRight && (
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => scroll("right")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Link href="/shorts">
            <Button variant="outline" size="sm" className="text-xs rounded-full px-4">
              View All
            </Button>
          </Link>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide pb-2">
        {shorts.map((video) => (
          <Link
            key={`short-${video.id}`}
            href={`/shorts?v=${video.id}`}
            className="w-[180px] flex-shrink-0 snap-start group"
          >
            {/* 9:16 portrait card */}
            <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted">
              {video.thumbnailURL ? (
                <Image
                  src={video.thumbnailURL}
                  alt={video.title}
                  fill
                  sizes="180px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <Play className="h-8 w-8 text-primary/60" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-xs font-medium line-clamp-2 drop-shadow-lg">
                  {video.title}
                </p>
                <p className="text-white/70 text-[10px] mt-0.5">
                  {formatViewCount(video.viewCount)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FeedPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [feedMode, setFeedMode] = useState<"explore" | "foryou">("explore");
  const { isSignedIn } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    error,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.videos.getFeed.useInfiniteQuery(
    { limit: 20, search: searchQuery || undefined },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 60_000, // 1 minute
    }
  );

  const { data: personalizedData, isLoading: isPersonalizedLoading } =
    trpc.videos.getPersonalizedFeed.useQuery(
      { limit: 30 },
      { enabled: feedMode === "foryou" && !!isSignedIn && !searchQuery }
    );

  // Fetch shorts separately for the shelf
  const { data: shortsData } = trpc.videos.getShorts.useInfiniteQuery(
    { limit: 12 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: feedMode === "explore" && !searchQuery,
    }
  );
  const shortsVideos = shortsData?.pages.flatMap((p) => p.items) ?? [];

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

  // ─── Not Interested filtering ─────────────────────────────────
  const { data: dismissedIds } = trpc.feedback.getDismissedVideoIds.useQuery(
    undefined,
    { enabled: !!isSignedIn }
  );
  const dismissedSet = new Set((dismissedIds ?? []).map((d) => d.videoId));

  const utils = trpc.useUtils();
  const notInterested = trpc.feedback.notInterested.useMutation({
    onSuccess: () => utils.feedback.getDismissedVideoIds.invalidate(),
  });
  const undoNotInterested = trpc.feedback.undoNotInterested.useMutation({
    onSuccess: () => utils.feedback.getDismissedVideoIds.invalidate(),
  });

  const handleDismiss = (videoId: string) => {
    notInterested.mutate({ videoId });
    toast("Video hidden from feed", {
      action: {
        label: "Undo",
        onClick: () => undoNotInterested.mutate({ videoId }),
      },
      icon: <Undo2 className="h-4 w-4" />,
      duration: 5000,
    });
  };

  const allVideos = (() => {
    const flat = data?.pages.flatMap((page) => page.items) ?? [];
    const seen = new Set<string>();
    return flat.filter((v) => {
      if (seen.has(v.id)) return false;
      if (dismissedSet.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
  })();

  // Infinite scroll — callback ref ensures observer attaches when div mounts
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMoreCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      loadMoreRef.current = node;
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            fetchNextPage();
          }
        },
        { rootMargin: "400px" }
      );
      observerRef.current.observe(node);
    },
    [fetchNextPage]
  );

  // Re-check when pagination state changes (covers edge case where sentinel is already visible)
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;
    const rect = loadMoreRef.current.getBoundingClientRect();
    if (rect.top < window.innerHeight + 400) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, allVideos.length]);

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
    <div className="max-w-[1500px] mx-auto px-6 py-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {[...Array(8)].map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : personalizedData && personalizedData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {personalizedData.filter((v) => !dismissedSet.has(v.id)).map((video) => (
              <div key={video.id} className="card-animate">
                <VideoCard video={video} onDismiss={handleDismiss} />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
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
                <Image src="/logo.svg" width={28} height={28} alt="NepTube" />
                <h2 className="text-lg font-bold">
                  {searchQuery ? "Neptube Video Results" : "Trending on Neptube"}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
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
          {/* Video grid with Shorts shelf injected after first row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {allVideos.slice(0, 4).map((video) => (
              <div key={video.id} className="card-animate">
                <VideoCard video={video} onDismiss={isSignedIn ? handleDismiss : undefined} />
              </div>
            ))}
          </div>

          {/* Shorts shelf — separate section between video rows */}
          {!searchQuery && shortsVideos.length > 0 && (
            <div className="mt-8 mb-8">
              <ShortsRow shorts={shortsVideos} />
            </div>
          )}

          {/* All remaining videos in a single continuous grid */}
          {allVideos.length > 4 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
              {allVideos.slice(4).map((video) => (
                <div key={video.id} className="card-animate">
                  <VideoCard video={video} onDismiss={isSignedIn ? handleDismiss : undefined} />
                </div>
              ))}
            </div>
          )}

          {/* Infinite scroll trigger — always visible at bottom */}
          <div ref={loadMoreCallbackRef} className="flex justify-center py-8">
            {isFetchingNextPage ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : hasNextPage ? (
              <span className="text-xs text-muted-foreground">Loading more...</span>
            ) : null}
          </div>

          {/* YouTube Section */}
          {ytConfigured?.configured && ytVideos.length > 0 && (
            <div className="mt-4 pt-6 border-t border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Image src="/logo.svg" width={28} height={28} alt="NepTube" />
                  <h2 className="text-lg font-bold">
                    {searchQuery ? (
                      <>Neptube video results for <span className="text-red-500">&quot;{searchQuery}&quot;</span></>
                    ) : (
                      <span>Trending on Neptube</span>
                    )}
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
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
                <Image src="/logo.svg" width={28} height={28} alt="NepTube" />
                <h2 className="text-lg font-bold">Trending on Neptube</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
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
      <div className="max-w-[1500px] mx-auto px-6 py-6">
        <Skeleton className="h-8 w-40 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
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