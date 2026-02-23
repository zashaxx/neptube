"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Share2,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  Play,
  Plus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatCount(count?: number | null): string {
  if (count == null) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

interface ShortVideo {
  id: string;
  title: string;
  videoURL: string | null;
  thumbnailURL: string | null;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  user: { id: string; name: string; imageURL: string };
}

function ShortCard({
  video,
  isActive,
}: {
  video: ShortVideo;
  isActive: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const { isSignedIn } = useAuth();

  const likeVideo = trpc.videos.toggleLike.useMutation();
  const incrementViews = trpc.videos.incrementViews.useMutation();

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive) {
      el.play().catch(() => {});
      setPlaying(true);
      incrementViews.mutate({ id: video.id });
    } else {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, video.id]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden snap-center flex-shrink-0">
      {video.videoURL ? (
        <video
          ref={videoRef}
          src={video.videoURL}
          loop
          muted={muted}
          playsInline
          className="w-full h-full object-contain"
          poster={video.thumbnailURL || undefined}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white">
          No video
        </div>
      )}

      {/* Click overlay for play/pause */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={togglePlay}
      />

      {/* Pause icon overlay */}
      {!playing && isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/40 rounded-full p-4">
            <Play className="h-12 w-12 text-white" fill="white" />
          </div>
        </div>
      )}

      {/* Right sidebar actions */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-30">
        {/* Like */}
        <button
          className="flex flex-col items-center gap-1"
          onClick={() =>
            isSignedIn && likeVideo.mutate({ videoId: video.id, isLike: true })
          }
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 hover:bg-white/20 transition">
            <ThumbsUp className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">
            {formatCount(video.likeCount)}
          </span>
        </button>

        {/* Dislike */}
        <button
          className="flex flex-col items-center gap-1"
          onClick={() =>
            isSignedIn && likeVideo.mutate({ videoId: video.id, isLike: false })
          }
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 hover:bg-white/20 transition">
            <ThumbsDown className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">
            {formatCount(video.dislikeCount)}
          </span>
        </button>

        {/* Comments */}
        <Link
          href={`/feed/${video.id}`}
          className="flex flex-col items-center gap-1"
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 hover:bg-white/20 transition">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">
            {formatCount(video.commentCount)}
          </span>
        </Link>

        {/* Share */}
        <button
          className="flex flex-col items-center gap-1"
          onClick={() => {
            navigator.clipboard.writeText(
              `${window.location.origin}/feed/${video.id}`
            );
          }}
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 hover:bg-white/20 transition">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">Share</span>
        </button>

        {/* Mute toggle */}
        <button
          className="flex flex-col items-center gap-1"
          onClick={() => setMuted(!muted)}
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 hover:bg-white/20 transition">
            {muted ? (
              <VolumeX className="h-6 w-6 text-white" />
            ) : (
              <Volume2 className="h-6 w-6 text-white" />
            )}
          </div>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-4 right-20 z-30">
        <Link href={`/channel/${video.user.id}`} className="flex items-center gap-2 mb-2">
          <Avatar className="h-9 w-9 border-2 border-white">
            <AvatarImage src={video.user.imageURL} />
            <AvatarFallback className="text-xs">
              {video.user.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-white font-semibold text-sm drop-shadow-lg">
            @{video.user.name}
          </span>
        </Link>
        <p className="text-white text-sm font-medium drop-shadow-lg line-clamp-2">
          {video.title}
        </p>
        <p className="text-white/70 text-xs mt-1 drop-shadow-lg">
          {formatCount(video.viewCount)} views
        </p>
      </div>
    </div>
  );
}

export default function ShortsPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch short videos using the dedicated shorts endpoint
  const { data: shorts, isLoading } = trpc.videos.getShorts.useInfiniteQuery(
    { limit: 20 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const allVideos = (() => {
    const flat = shorts?.pages.flatMap((page) => page.items) ?? [];
    const seen = new Set<string>();
    return flat.filter((v) => {
      if (!v.id || seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
  })() as unknown as ShortVideo[];

  const goUp = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goDown = useCallback(() => {
    setCurrentIndex((prev) => Math.min(allVideos.length - 1, prev + 1));
  }, [allVideos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        goUp();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        goDown();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goUp, goDown]);

  // Scroll snap handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const height = container.clientHeight;
      const newIndex = Math.round(scrollTop / height);
      setCurrentIndex(newIndex);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to current index
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({
      top: currentIndex * container.clientHeight,
      behavior: "smooth",
    });
  }, [currentIndex]);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-56px)] w-full grid place-items-center">
        <div className="w-[360px] h-[640px] sm:w-[400px] sm:h-[710px]">
          <Skeleton className="w-full h-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (allVideos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Play className="h-10 w-10 text-primary/60" />
        </div>
        <h2 className="text-lg font-semibold mb-1">No Shorts yet</h2>
        <p className="text-muted-foreground text-sm max-w-sm mb-4">
          Upload short videos (under 60 seconds) to see them here!
        </p>
        <Link href="/studio/upload?type=short">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Upload Short
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] w-full flex flex-col">
      {/* Upload Short link */}
      <div className="flex justify-center py-2">
        <Link href="/studio/upload?type=short">
          <Button variant="ghost" className="gap-2 text-sm">
            <Plus className="h-4 w-4" />
            Upload Short
          </Button>
        </Link>
      </div>

      {/* Centered shorts player */}
      <div className="flex-1 grid place-items-center">
        <div className="flex items-center gap-4">
          {/* Shorts container */}
          <div
            ref={containerRef}
            className="w-[360px] h-[640px] sm:w-[400px] sm:h-[710px] overflow-y-scroll snap-y snap-mandatory scrollbar-hide rounded-2xl"
            style={{ scrollSnapType: "y mandatory" }}
          >
            {allVideos.map((video, index) => (
              <div key={video.id} className="w-full h-full snap-center">
                <ShortCard
                  video={video as unknown as ShortVideo}
                  isActive={index === currentIndex}
                />
              </div>
            ))}
          </div>

          {/* Navigation arrows */}
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background/80 backdrop-blur-sm"
              onClick={goUp}
              disabled={currentIndex === 0}
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background/80 backdrop-blur-sm"
              onClick={goDown}
              disabled={currentIndex === allVideos.length - 1}
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
