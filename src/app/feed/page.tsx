"use client";

import { Suspense, useEffect, useRef, useCallback, useState, useMemo } from "react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Eye, Upload, Search, Loader2, Sparkles, TrendingUp, Play,
  ChevronLeft, ChevronRight, MoreVertical, EyeOff, Ban, Undo2,
  Flame, Clock, Zap, BookOpen, Gamepad2, Music, Trophy,
  Star, Target, Layers, ThumbsUp, Users, BarChart3,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@clerk/nextjs";
import { YouTubeVideoCard, YouTubeVideoCardSkeleton } from "@/components/youtube-video-card";
import { toast } from "sonner";

// ─── Community Feed Section ──────────────────────────────────────────
function CommunityFeedSection() {
  const { isSignedIn } = useAuth();
  const utils = trpc.useUtils();
  const { data: posts, isLoading } = trpc.community.getAll.useQuery({ limit: 6 });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Users className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-bold">Community</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Users className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-bold">Community</h2>
        </div>
        <Link href="/community">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
            View all
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <CommunityPostMiniCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

function CommunityPostMiniCard({ post }: { post: {
  id: string;
  type: string;
  content: string;
  imageURL: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: Date | string;
  user: { id: string; name: string; imageURL: string };
  pollOptions: { id: string; text: string; voteCount: number }[];
} }) {
  const { isSignedIn } = useAuth();
  const utils = trpc.useUtils();

  const { data: hasLiked } = trpc.community.hasLiked.useQuery(
    { postId: post.id },
    { enabled: !!isSignedIn }
  );

  const toggleLike = trpc.community.toggleLike.useMutation({
    onSuccess: (data) => {
      utils.community.getAll.invalidate();
      utils.community.hasLiked.invalidate({ postId: post.id });
      toast(data.liked ? "Liked!" : "Unliked");
    },
  });

  const totalVotes = post.pollOptions.reduce((s, o) => s + o.voteCount, 0);

  return (
    <Link href="/community" className="block">
      <div className="glass-card rounded-xl p-4 hover:border-primary/30 transition-all duration-300 h-full flex flex-col">
        <div className="flex items-start gap-2.5">
          <Avatar className="h-8 w-8 rounded-lg flex-shrink-0">
            <AvatarImage src={post.user.imageURL} />
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs">
              {post.user.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs truncate">{post.user.name}</span>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs mt-2 line-clamp-3 text-muted-foreground leading-relaxed flex-1">
          {post.content}
        </p>

        {post.imageURL && (
          <div className="mt-2 rounded-lg overflow-hidden border border-border">
            <Image src={post.imageURL} alt="" width={400} height={200} className="w-full object-cover h-32" />
          </div>
        )}

        {post.type === "poll" && post.pollOptions.length > 0 && (
          <div className="mt-2 space-y-1">
            {post.pollOptions.slice(0, 3).map((opt) => {
              const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
              return (
                <div key={opt.id} className="relative overflow-hidden rounded-md border border-border/50 p-1.5 text-[11px]">
                  <div className="absolute inset-0 bg-primary/10" style={{ width: `${pct}%` }} />
                  <div className="relative flex items-center justify-between">
                    <span className="truncate">{opt.text}</span>
                    <span className="text-muted-foreground ml-1 flex-shrink-0">{pct}%</span>
                  </div>
                </div>
              );
            })}
            {post.pollOptions.length > 3 && (
              <p className="text-[10px] text-muted-foreground">+{post.pollOptions.length - 3} more options</p>
            )}
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isSignedIn) { toast.error("Sign in to like"); return; }
              toggleLike.mutate({ postId: post.id });
            }}
            disabled={toggleLike.isPending}
            className={`flex items-center gap-1 text-[11px] transition-colors ${
              hasLiked ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"
            }`}
          >
            <ThumbsUp className={`h-3 w-3 ${hasLiked ? "fill-primary" : ""}`} />
            {post.likeCount > 0 ? post.likeCount : "Like"}
          </button>
        </div>
      </div>
    </Link>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────
function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
  return `${count} views`;
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Late Night Picks";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  if (h < 21) return "Good Evening";
  return "Night Owl Mode";
}

function getTimeMood(): "learn" | "chill" | "explore" {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "learn";
  if (h >= 21 || h < 6) return "chill";
  return "explore";
}

type VideoType = {
  id: string;
  title: string;
  thumbnailURL: string | null;
  viewCount: number;
  createdAt: Date | string;
  tags: string[] | null;
  isNsfw: boolean | null;
  likeCount?: number;
  category?: string | null;
  user: {
    id: string;
    name: string;
    imageURL: string;
  };
};

// ─── Category pill data ──────────────────────────────────────────────
const categoryFilters = [
  { label: "All", value: "", icon: Layers },
  { label: "Trending", value: "__trending", icon: Flame },
  { label: "Gaming", value: "Gaming", icon: Gamepad2 },
  { label: "Music", value: "Music", icon: Music },
  { label: "Education", value: "Education", icon: BookOpen },
  { label: "Sports", value: "Sports", icon: Trophy },
  { label: "Technology", value: "Technology", icon: Zap },
  { label: "Entertainment", value: "Entertainment", icon: Star },
];

// ─── Hero Card (cinematic feature) ──────────────────────────────────
function HeroCard({ video, onDismiss }: { video: VideoType; onDismiss?: (id: string) => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative group rounded-2xl overflow-hidden bento-hero-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {onDismiss && (
        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-black/70 transition-colors magnetic-btn">
                <MoreVertical className="h-4 w-4 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 glass-card border-border/50">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDismiss(video.id); }}>
                <EyeOff className="h-4 w-4 mr-2" /> Not interested
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDismiss(video.id); }}>
                <Ban className="h-4 w-4 mr-2" /> Don&apos;t recommend channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Link href={`/feed/${video.id}`} className="block">
        <div className="relative w-full" style={{ aspectRatio: "21/9" }}>
          {video.isNsfw && (
            <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-xl flex items-center justify-center">
              <span className="text-red-400 text-sm font-medium">NSFW Content</span>
            </div>
          )}
          {video.thumbnailURL ? (
            <Image
              src={video.thumbnailURL}
              alt={video.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 70vw"
              className={`object-cover transition-all duration-700 ${isHovered ? "scale-[1.05] brightness-110" : "scale-100"}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/5">
              <Play className="h-16 w-16 text-primary/40" />
            </div>
          )}

          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

          {/* Play button pulse */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}>
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 hero-play-pulse">
              <Play className="h-7 w-7 text-white ml-1" fill="white" />
            </div>
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-primary/90 text-white border-none text-[10px] px-2 py-0.5 uppercase tracking-wider">
                <Flame className="h-3 w-3 mr-1" /> Featured
              </Badge>
              {video.category && (
                <Badge variant="outline" className="border-white/30 text-white/90 text-[10px]">
                  {video.category}
                </Badge>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-2 drop-shadow-2xl">
              {video.title}
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/30">
                  {video.user.imageURL ? (
                    <Image src={video.user.imageURL} alt={video.user.name} width={32} height={32} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-primary/40 flex items-center justify-center text-white text-xs font-bold">
                      {video.user.name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-white/90 text-sm font-medium">{video.user.name}</span>
              </div>
              <span className="text-white/50 text-xs">•</span>
              <span className="text-white/60 text-xs">{formatViewCount(video.viewCount)}</span>
              <span className="text-white/50 text-xs">•</span>
              <span className="text-white/60 text-xs">{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ─── Bento Video Card (glass, magnetic, premium) ────────────────────
function BentoVideoCard({ video, size = "normal", onDismiss }: {
  video: VideoType;
  size?: "normal" | "wide" | "tall";
  onDismiss?: (videoId: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const aspectRatio = size === "wide" ? "2/1" : size === "tall" ? "3/4" : "16/9";

  return (
    <div
      className={`relative group bento-card magnetic-btn ${
        size === "wide" ? "sm:col-span-2" : size === "tall" ? "sm:row-span-2" : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {onDismiss && (
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-black/70 transition-colors">
                <MoreVertical className="h-3.5 w-3.5 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 glass-card">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDismiss(video.id); }}>
                <EyeOff className="h-4 w-4 mr-2" /> Not interested
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDismiss(video.id); }}>
                <Ban className="h-4 w-4 mr-2" /> Don&apos;t recommend
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Link href={`/feed/${video.id}`} className="block h-full">
        <div className="relative w-full rounded-xl overflow-hidden thumbnail-hover" style={{ aspectRatio }}>
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
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className={`object-cover transition-all duration-500 ${isHovered ? "scale-[1.06] brightness-110" : "scale-100"}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-muted">
              <span className="text-muted-foreground text-lg font-bold">{video.title[0]?.toUpperCase()}</span>
            </div>
          )}

          {/* Hover play overlay */}
          <div className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}>
            <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
            </div>
          </div>

          {/* View count badge */}
          {video.viewCount > 1000 && (
            <div className="absolute top-2 left-2 z-10">
              <Badge className="bg-black/60 backdrop-blur-md text-white border-none text-[9px] gap-1">
                <Flame className="h-2.5 w-2.5 text-orange-400" />
                {formatViewCount(video.viewCount).replace(" views", "")}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex gap-2.5 mt-3">
          <div className="flex-shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-muted ring-2 ring-transparent group-hover:ring-primary/30 transition-all duration-300">
              {video.user.imageURL ? (
                <Image src={video.user.imageURL} alt={video.user.name} width={36} height={36} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-semibold">
                  {video.user.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[13px] line-clamp-2 leading-snug group-hover:text-primary transition-colors duration-300">
              {video.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate hover:text-foreground transition-colors">
              {video.user.name}
            </p>
            <p className="text-[11px] text-muted-foreground/70 leading-tight mt-0.5">
              {formatViewCount(video.viewCount)} · {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ─── Skeleton variants ──────────────────────────────────────────────
function HeroSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden">
      <Skeleton className="w-full" style={{ aspectRatio: "21/9" }} />
    </div>
  );
}

function BentoSkeleton({ size = "normal" }: { size?: "normal" | "wide" }) {
  return (
    <div className={size === "wide" ? "sm:col-span-2" : ""}>
      <Skeleton className="w-full rounded-xl" style={{ aspectRatio: size === "wide" ? "2/1" : "16/9" }} />
      <div className="flex gap-3 mt-3">
        <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

// ─── Shorts Carousel ────────────────────────────────────────────────
function ShortsCarousel({ shorts }: { shorts: { id: string; title: string; thumbnailURL: string | null; viewCount: number; duration: number | null; user: { name: string } }[] }) {
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
    <section className="relative">
      <div className="flex items-center justify-between mb-4">
        <Link href="/shorts" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center overflow-hidden">
            <Image src="/logo.svg" width={20} height={20} alt="NepTube" />
          </div>
          <h2 className="text-lg font-bold group-hover:text-primary transition-colors">Shorts</h2>
        </Link>
        <div className="flex items-center gap-2">
          {canScrollLeft && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => scroll("left")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {canScrollRight && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => scroll("right")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          <Link href="/shorts">
            <Button variant="outline" size="sm" className="text-xs rounded-full px-4 border-border/50 hover:border-primary/50">
              View All
            </Button>
          </Link>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide pb-2">
        {shorts.map((video) => (
          <Link
            key={`short-${video.id}`}
            href={`/shorts?v=${video.id}`}
            className="w-[160px] flex-shrink-0 snap-start group"
          >
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-muted shorts-card-3d">
              {video.thumbnailURL ? (
                <Image
                  src={video.thumbnailURL}
                  alt={video.title}
                  fill
                  sizes="160px"
                  className="object-cover transition-all duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-pink-500/10">
                  <Play className="h-8 w-8 text-primary/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-2.5 left-2.5 right-2.5">
                <p className="text-white text-[11px] font-medium line-clamp-2 drop-shadow-lg leading-tight">
                  {video.title}
                </p>
                <p className="text-white/60 text-[10px] mt-1">
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

// ─── Category Carousel (horizontal swipeable stacks) ────────────────
function CategoryWorldsCarousel({ videos }: { videos: VideoType[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, VideoType[]> = {};
    videos.forEach((v) => {
      const cat = v.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(v);
    });
    return Object.entries(groups).filter(([, vids]) => vids.length >= 2).slice(0, 5);
  }, [videos]);

  if (grouped.length === 0) return null;

  const catIcons: Record<string, typeof Gamepad2> = {
    Gaming: Gamepad2, Music: Music, Education: BookOpen, Sports: Trophy,
    Technology: Zap, Entertainment: Star, Comedy: Star,
  };

  return (
    <section>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Target className="h-4 w-4 text-white" />
        </div>
        <h2 className="text-lg font-bold">Topic Worlds</h2>
      </div>
      <div ref={scrollRef} className="flex gap-5 overflow-x-auto snap-x scroll-smooth scrollbar-hide pb-2">
        {grouped.map(([category, vids]) => {
          const Icon = catIcons[category] || Star;
          return (
            <div key={category} className="min-w-[280px] max-w-[320px] flex-shrink-0 snap-start">
              <div className="glass-card rounded-xl p-4 h-full category-world-card">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">{category}</h3>
                  <Badge variant="secondary" className="ml-auto text-[10px]">{vids.length}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {vids.slice(0, 4).map((v) => (
                    <Link key={v.id} href={`/feed/${v.id}`} className="group">
                      <div className="relative aspect-video rounded-lg overflow-hidden">
                        {v.thumbnailURL ? (
                          <Image src={v.thumbnailURL} alt={v.title} fill sizes="140px" className="object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Play className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] mt-1 line-clamp-1 text-muted-foreground group-hover:text-foreground transition-colors">{v.title}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Gamification Stats Bar ─────────────────────────────────────────
function GamificationBar() {
  // Simulated XP/streak data (in production these would come from tRPC)
  const xp = 1250;
  const level = Math.floor(xp / 500) + 1;
  const xpProgress = (xp % 500) / 500;
  const streak = 5;

  return (
    <div className="glass-card rounded-xl p-3 flex items-center gap-4 text-sm gamification-bar">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">
          {level}
        </div>
        <div>
          <p className="text-[11px] font-medium">Level {level}</p>
          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000" style={{ width: `${xpProgress * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="h-6 w-px bg-border/50" />
      <div className="flex items-center gap-1.5">
        <Flame className="h-4 w-4 text-orange-500" />
        <span className="text-xs font-semibold">{streak} day streak</span>
      </div>
      <div className="h-6 w-px bg-border/50" />
      <div className="flex items-center gap-1.5">
        <Star className="h-4 w-4 text-yellow-500" />
        <span className="text-xs font-semibold">{xp.toLocaleString()} XP</span>
      </div>
      <div className="ml-auto">
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary gap-1 cursor-pointer hover:bg-primary/10 transition-colors">
          <Trophy className="h-3 w-3" />
          Leaderboard
        </Badge>
      </div>
    </div>
  );
}

// ─── Main Feed Page ─────────────────────────────────────────────────
function FeedPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [feedMode, setFeedMode] = useState<"explore" | "foryou">("explore");
  const [activeCategory, setActiveCategory] = useState("");
  const [sortBy, setSortBy] = useState<"relevance" | "latest" | "views">("relevance");
  const [focusMode, setFocusMode] = useState(false);
  const { isSignedIn } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const timeMood = getTimeMood();

  const {
    data, error, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = trpc.videos.getFeed.useInfiniteQuery(
    { limit: 20, search: searchQuery || undefined },
    { getNextPageParam: (lastPage) => lastPage.nextCursor, staleTime: 60_000 }
  );

  const { data: personalizedData, isLoading: isPersonalizedLoading } =
    trpc.videos.getPersonalizedFeed.useQuery(
      { limit: 30 },
      { enabled: feedMode === "foryou" && !!isSignedIn && !searchQuery }
    );

  const { data: shortsData } = trpc.videos.getShorts.useInfiniteQuery(
    { limit: 12 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor, enabled: feedMode === "explore" && !searchQuery }
  );
  const shortsVideos = shortsData?.pages.flatMap((p) => p.items) ?? [];

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

  // ─── Not Interested ────────────────────────────────────
  const { data: dismissedIds } = trpc.feedback.getDismissedVideoIds.useQuery(undefined, { enabled: !!isSignedIn });
  const dismissedSet = new Set((dismissedIds ?? []).map((d) => d.videoId));
  const utils = trpc.useUtils();
  const notInterested = trpc.feedback.notInterested.useMutation({ onSuccess: () => utils.feedback.getDismissedVideoIds.invalidate() });
  const undoNotInterested = trpc.feedback.undoNotInterested.useMutation({ onSuccess: () => utils.feedback.getDismissedVideoIds.invalidate() });

  const handleDismiss = (videoId: string) => {
    notInterested.mutate({ videoId });
    toast("Video hidden from feed", {
      action: { label: "Undo", onClick: () => undoNotInterested.mutate({ videoId }) },
      icon: <Undo2 className="h-4 w-4" />,
      duration: 5000,
    });
  };

  const allVideos = useMemo(() => {
    const flat = data?.pages.flatMap((page) => page.items) ?? [];
    const seen = new Set<string>();
    return flat.filter((v) => {
      if (seen.has(v.id) || dismissedSet.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dismissedIds]);

  // Category filtering
  const filteredVideos = useMemo(() => {
    if (!activeCategory || activeCategory === "__trending") return allVideos;
    return allVideos.filter((v) => v.category === activeCategory);
  }, [allVideos, activeCategory]);

  // Sort trending + search sort
  const sortedVideos = useMemo(() => {
    if (activeCategory === "__trending") {
      return [...filteredVideos].sort((a, b) => b.viewCount - a.viewCount);
    }
    if (searchQuery && sortBy !== "relevance") {
      return [...filteredVideos].sort((a, b) => {
        if (sortBy === "views") return b.viewCount - a.viewCount;
        if (sortBy === "latest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return 0;
      });
    }
    return filteredVideos;
  }, [filteredVideos, activeCategory, searchQuery, sortBy]);

  // Split videos for bento layout
  const heroVideo = sortedVideos[0];
  const secondaryVideos = sortedVideos.slice(1, 5);
  const remainingVideos = sortedVideos.slice(5);

  // Infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null; }
      loadMoreRef.current = node;
      if (!node) return;
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      }, { rootMargin: "400px" });
      observerRef.current.observe(node);
    },
    [fetchNextPage]
  );

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;
    const rect = loadMoreRef.current.getBoundingClientRect();
    if (rect.top < window.innerHeight + 400) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, allVideos.length]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center glass-card rounded-2xl p-8">
          <p className="text-red-500 mb-2 font-semibold">Error loading videos</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-[1400px] mx-auto px-4 md:px-6 py-5 feed-container ${focusMode ? "focus-mode" : ""}`}>
      {/* ── Header with time-adaptive greeting ── */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {searchQuery ? (
                <>Results for <span className="gradient-text">&quot;{searchQuery}&quot;</span></>
              ) : (
                <span className="gradient-text">
                  {feedMode === "foryou" ? "For You" : getTimeGreeting()}
                </span>
              )}
            </h1>
            {!searchQuery && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {timeMood === "learn" ? "Perfect time for learning" : timeMood === "chill" ? "Sit back and relax" : "Discover something new"}
              </p>
            )}
            {searchQuery && (
              <p className="text-xs text-muted-foreground mt-1">
                {sortedVideos.length} result{sortedVideos.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Sort + Focus controls */}
          <div className="flex items-center gap-2">
            {searchQuery && (
              <div className="flex items-center gap-1 bg-muted/50 rounded-full p-0.5">
                {(["relevance", "latest", "views"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSortBy(opt)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 capitalize ${
                      sortBy === opt
                        ? "bg-foreground text-background shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt === "views" ? "Most viewed" : opt}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                focusMode
                  ? "bg-foreground text-background shadow-lg"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Eye className="h-3 w-3" />
              Focus
            </button>
          </div>
        </div>

        {/* Feed Mode Tabs */}
        {!searchQuery && isSignedIn && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setFeedMode("explore")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                feedMode === "explore"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Explore
            </button>
            <button
              onClick={() => setFeedMode("foryou")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                feedMode === "foryou"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              For You
            </button>
          </div>
        )}

        {/* Category Filter Pills */}
        {!searchQuery && feedMode === "explore" && (
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
            {categoryFilters.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300 ${
                    activeCategory === cat.value
                      ? "bg-foreground text-background shadow-md"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Gamification Bar */}
      {isSignedIn && !searchQuery && !focusMode && <GamificationBar />}

      {/* ── Personalized Feed ── */}
      {feedMode === "foryou" && !searchQuery && isSignedIn ? (
        isPersonalizedLoading ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <BentoSkeleton key={i} />)}
          </div>
        ) : personalizedData && personalizedData.length > 0 ? (
          <div className="mt-6 space-y-6">
            {/* Hero */}
            {personalizedData[0] && !focusMode && (
              <div className="card-animate">
                <HeroCard video={personalizedData[0]} onDismiss={handleDismiss} />
              </div>
            )}
            {/* Bento grid */}
            <div className="bento-grid">
              {(focusMode ? personalizedData : personalizedData.slice(1))
                .filter((v) => !dismissedSet.has(v.id))
                .map((video, i) => (
                  <div key={video.id} className="card-animate" style={{ animationDelay: `${i * 0.04}s` }}>
                    <BentoVideoCard
                      video={video}
                      size={!focusMode && (i === 0 || i === 5) ? "wide" : "normal"}
                      onDismiss={handleDismiss}
                    />
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-10 w-10 text-primary/60" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No personalized suggestions yet</h2>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm">Watch some videos first so we can learn your preferences!</p>
            <Button variant="outline" className="gap-2 rounded-full" onClick={() => setFeedMode("explore")}>
              <TrendingUp className="h-4 w-4" /> Browse Explore
            </Button>
          </div>
        )
      ) : (
        /* ── Regular Explore Feed ── */
        isLoading ? (
          <div className="mt-6 space-y-6">
            <HeroSkeleton />
            <div className="bento-grid">
              {[...Array(4)].map((_, i) => <BentoSkeleton key={i} size={i === 0 ? "wide" : "normal"} />)}
            </div>
          </div>
        ) : sortedVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5">
              {searchQuery ? <Search className="h-12 w-12 text-primary/50" /> : <Eye className="h-12 w-12 text-primary/50" />}
            </div>
            <h2 className="text-xl font-bold mb-2">{searchQuery ? "Nothing found" : "No videos yet"}</h2>
            <p className="text-muted-foreground text-sm mb-5 max-w-sm">
              {searchQuery ? `No videos match "${searchQuery}". Try a different search.` : "Be the first to share something with the community."}
            </p>
            {!searchQuery && (
              <Link href="/studio/upload">
                <Button className="gap-2 gradient-btn rounded-full px-6 py-2.5 font-medium shadow-lg">
                  <Upload className="h-4 w-4" /> Upload Video
                </Button>
              </Link>
            )}

            {ytConfigured?.configured && ytVideos.length > 0 && (
              <div className="mt-10 w-full max-w-7xl text-left">
                <div className="flex items-center gap-2 mb-4">
                  <Image src="/logo.svg" width={28} height={28} alt="NepTube" />
                  <h2 className="text-lg font-bold">{searchQuery ? "Neptube Video Results" : "Trending on Neptube"}</h2>
                </div>
                <div className="bento-grid">
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
          <div className="mt-6 space-y-8">
            {/* ── Hero Feature ── */}
            {heroVideo && !focusMode && (
              <div className="card-animate">
                <HeroCard video={heroVideo} onDismiss={isSignedIn ? handleDismiss : undefined} />
              </div>
            )}

            {/* ── Secondary Bento Row ── */}
            {secondaryVideos.length > 0 && (
              <div className="bento-grid">
                {secondaryVideos.map((video, i) => (
                  <div key={video.id} className="card-animate" style={{ animationDelay: `${(i + 1) * 0.05}s` }}>
                    <BentoVideoCard
                      video={video}
                      size={!focusMode && i === 0 ? "wide" : "normal"}
                      onDismiss={isSignedIn ? handleDismiss : undefined}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ── Shorts Carousel ── */}
            {!searchQuery && shortsVideos.length > 0 && !focusMode && (
              <ShortsCarousel shorts={shortsVideos} />
            )}

            {/* ── Community Posts ── */}
            {!searchQuery && !focusMode && (
              <CommunityFeedSection />
            )}

            {/* ── Topic Worlds ── */}
            {!searchQuery && allVideos.length > 6 && !focusMode && (
              <CategoryWorldsCarousel videos={allVideos} />
            )}

            {/* ── Remaining Videos in Bento ── */}
            {remainingVideos.length > 0 && (
              <div>
                {!focusMode && (
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                      <Layers className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-lg font-bold">More to Explore</h2>
                  </div>
                )}
                <div className={focusMode ? "minimal-grid" : "bento-grid"}>
                  {remainingVideos.map((video, i) => (
                    <div key={video.id} className="card-animate" style={{ animationDelay: `${Math.min(i * 0.03, 0.5)}s` }}>
                      {focusMode ? (
                        /* ── Minimal Mode: title-only cards ── */
                        <Link href={`/feed/${video.id}`} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-all duration-300">
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                            {video.thumbnailURL ? (
                              <Image src={video.thumbnailURL} alt="" width={40} height={40} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-bold">{video.title[0]?.toUpperCase()}</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">{video.title}</h3>
                            <p className="text-[11px] text-muted-foreground">{video.user.name} · {formatViewCount(video.viewCount)}</p>
                          </div>
                          {video.tags && video.tags.length > 0 && (
                            <Badge variant="outline" className="text-[9px] flex-shrink-0">{video.tags[0]}</Badge>
                          )}
                        </Link>
                      ) : (
                        <BentoVideoCard
                          video={video}
                          size={(i % 7 === 0) ? "wide" : "normal"}
                          onDismiss={isSignedIn ? handleDismiss : undefined}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Infinite Scroll ── */}
            <div ref={loadMoreCallbackRef} className="flex justify-center py-6">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Loading more...</span>
                </div>
              ) : hasNextPage ? (
                <span className="text-xs text-muted-foreground">Scroll for more</span>
              ) : allVideos.length > 0 ? (
                <span className="text-xs text-muted-foreground/50">You&apos;ve seen it all</span>
              ) : null}
            </div>

            {/* ── YouTube Section ── */}
            {ytConfigured?.configured && ytVideos.length > 0 && (
              <div className="pt-6 border-t border-border/30">
                <div className="flex items-center gap-2.5 mb-4">
                  <Image src="/logo.svg" width={28} height={28} alt="NepTube" />
                  <h2 className="text-lg font-bold">
                    {searchQuery ? (<>Neptube results for <span className="text-primary">&quot;{searchQuery}&quot;</span></>) : "Trending on Neptube"}
                  </h2>
                </div>
                <div className="bento-grid">
                  {ytVideos.map((video) => (
                    <div key={video.id} className="card-animate">
                      <YouTubeVideoCard video={video} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {ytConfigured?.configured && ytLoading && (
              <div className="pt-6 border-t border-border/30">
                <div className="flex items-center gap-2 mb-4">
                  <Image src="/logo.svg" width={28} height={28} alt="NepTube" />
                  <h2 className="text-lg font-bold">Trending on Neptube</h2>
                </div>
                <div className="bento-grid">
                  {[...Array(4)].map((_, i) => <YouTubeVideoCardSkeleton key={i} />)}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

export default function FeedPageWrapper() {
  return (
    <Suspense fallback={
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5">
        <Skeleton className="h-10 w-56 mb-5 rounded-lg" />
        <HeroSkeleton />
        <div className="bento-grid mt-6">
          {[...Array(6)].map((_, i) => <BentoSkeleton key={i} />)}
        </div>
      </div>
    }>
      <FeedPage />
    </Suspense>
  );
}