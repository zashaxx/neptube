"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import {
  ThumbsUp,
  Eye,
  MessageCircle,
  ExternalLink,
  ArrowLeft,
  Share2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useCallback } from "react";

function formatCount(count?: number | null): string {
  if (!count) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
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

export default function YouTubeWatchPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;
  const [copied, setCopied] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const { data: video, isLoading } = trpc.youtube.getById.useQuery(
    { id: videoId },
    { enabled: !!videoId }
  );

  // Get related videos (search by title keywords)
  const searchQuery = video?.title?.split(" ").slice(0, 3).join(" ") || "";
  const { data: relatedData } = trpc.youtube.search.useQuery(
    { query: searchQuery, maxResults: 8 },
    { enabled: !!searchQuery }
  );

  const relatedVideos = (relatedData?.videos ?? []).filter((v) => v.id !== videoId);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${videoId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [videoId]);

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="aspect-video rounded-xl" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-xl font-semibold mb-2">Video not available</h2>
        <p className="text-muted-foreground mb-4">
          This YouTube video could not be loaded. The API key may not be configured.
        </p>
        <Button onClick={() => router.push("/feed")} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Feed
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* YouTube Embedded Player */}
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>

          {/* Video Info */}
          <div className="space-y-3">
            <h1 className="text-xl font-bold leading-tight">{video.title}</h1>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Channel info */}
              <Link
                href={`https://www.youtube.com/channel/${video.channelId}`}
                target="_blank"
                className="flex items-center gap-3 hover:opacity-80 transition"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={video.channelThumbnail} />
                  <AvatarFallback className="bg-red-500/10 text-red-500 font-semibold">
                    {video.channelTitle[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm flex items-center gap-1.5">
                    {video.channelTitle}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </p>
                  <p className="text-xs text-muted-foreground">YouTube Channel</p>
                </div>
              </Link>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-3 py-2">
                  <ThumbsUp className="h-4 w-4" />
                  <span className="text-sm font-medium">{formatCount(video.likeCount)}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  {copied ? "Copied!" : "Share"}
                </Button>

                <Link
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                >
                  <Button variant="outline" size="sm" className="gap-1.5 text-red-500 border-red-500/30 hover:bg-red-500/10">
                    <ExternalLink className="h-4 w-4" />
                    YouTube
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {formatCount(video.viewCount)} views
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                {formatCount(video.commentCount)} comments
              </span>
              <span>
                {formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true })}
              </span>
              <span>{parseDuration(video.duration)}</span>
            </div>

            {/* Description */}
            <div className="glass-card rounded-xl p-4 space-y-2">
              <p
                className={`text-sm whitespace-pre-wrap ${
                  showFullDesc ? "" : "line-clamp-3"
                }`}
              >
                {video.description}
              </p>
              {video.description && video.description.length > 200 && (
                <button
                  onClick={() => setShowFullDesc(!showFullDesc)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {showFullDesc ? "Show less" : "Show more"}
                </button>
              )}
            </div>

            {/* Tags */}
            {video.tags && video.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {video.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs rounded bg-red-500/5 text-red-500/70 border border-red-500/10 cursor-pointer hover:bg-red-500/10"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Comments notice */}
            <div className="glass-card rounded-xl p-6 text-center">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Comments are available on YouTube.{" "}
                <Link
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  className="text-red-500 hover:underline font-medium"
                >
                  View on YouTube →
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar — Related Videos */}
        <div className="space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Related Videos
          </h2>
          {relatedVideos.length > 0 ? (
            relatedVideos.map((rv) => (
              <Link
                key={rv.id}
                href={`/watch/yt/${rv.id}`}
                className="group flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition"
              >
                <div className="relative w-40 aspect-video bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={rv.thumbnailURL}
                    alt={rv.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 py-0.5 rounded">
                    {parseDuration(rv.duration)}
                  </div>
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {rv.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{rv.channelTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCount(rv.viewCount)} views
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
