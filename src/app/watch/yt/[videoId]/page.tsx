"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import {
  ThumbsUp,
  ThumbsDown,
  Eye,
  MessageCircle,
  ExternalLink,
  ArrowLeft,
  Share2,
  Check,
  Bell,
  BellOff,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

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

// ─── Comment Component ───────────────────────────────────────────────────────

function YouTubeComment({
  comment,
  videoId,
}: {
  comment: {
    id: string;
    content: string;
    likeCount: number;
    createdAt: Date;
    user: { id: string; name: string; imageURL: string };
  };
  videoId: string;
}) {
  const { user: clerkUser } = useUser();
  const utils = trpc.useUtils();
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);

  const { data: replies } = trpc.youtube.getCommentReplies.useQuery(
    { parentId: comment.id },
    { enabled: showReplies }
  );

  const addReply = trpc.youtube.addComment.useMutation({
    onSuccess: () => {
      setReplyText("");
      setShowReplyInput(false);
      utils.youtube.getCommentReplies.invalidate({ parentId: comment.id });
      utils.youtube.getCommentCount.invalidate({ youtubeVideoId: videoId });
    },
  });

  const deleteComment = trpc.youtube.deleteComment.useMutation({
    onSuccess: () => {
      utils.youtube.getComments.invalidate({ youtubeVideoId: videoId });
      utils.youtube.getCommentCount.invalidate({ youtubeVideoId: videoId });
    },
  });

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={comment.user.imageURL} />
        <AvatarFallback className="text-xs">
          {comment.user.name[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.user.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => setShowReplyInput(!showReplyInput)}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            Reply
          </button>
          {clerkUser && (
            <button
              onClick={() => deleteComment.mutate({ commentId: comment.id })}
              className="text-xs text-muted-foreground hover:text-red-500 transition"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="text-xs text-primary flex items-center gap-1"
          >
            {showReplies ? (
              <>
                <ChevronUp className="h-3 w-3" /> Hide replies
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> View replies
              </>
            )}
          </button>
        </div>

        {/* Reply input */}
        {showReplyInput && (
          <div className="mt-3 flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="min-h-[60px] text-sm resize-none"
            />
            <Button
              size="sm"
              disabled={!replyText.trim() || addReply.isPending}
              onClick={() =>
                addReply.mutate({
                  youtubeVideoId: videoId,
                  content: replyText.trim(),
                  parentId: comment.id,
                })
              }
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Replies */}
        {showReplies && replies && replies.length > 0 && (
          <div className="mt-3 space-y-3 pl-2 border-l-2 border-border/50">
            {replies.map((reply) => (
              <div key={reply.id} className="flex gap-2">
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarImage src={reply.user.imageURL} />
                  <AvatarFallback className="text-[10px]">
                    {reply.user.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{reply.user.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5">{reply.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function YouTubeWatchPage() {
  const params = useParams();
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const videoId = params.videoId as string;
  const [copied, setCopied] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [commentText, setCommentText] = useState("");
  const utils = trpc.useUtils();

  // ── Data fetches ──────────────────────────────────────────────────────────

  const { data: video, isLoading } = trpc.youtube.getById.useQuery(
    { id: videoId },
    { enabled: !!videoId }
  );

  // Related videos
  const searchQuery = video?.title?.split(" ").slice(0, 3).join(" ") || "";
  const { data: relatedData } = trpc.youtube.search.useQuery(
    { query: searchQuery, maxResults: 8 },
    { enabled: !!searchQuery }
  );
  const relatedVideos = (relatedData?.videos ?? []).filter((v) => v.id !== videoId);

  // NepTube-native interactions
  const { data: likeStatus } = trpc.youtube.getLikeStatus.useQuery(
    { youtubeVideoId: videoId },
    { enabled: !!videoId && !!clerkUser }
  );

  const { data: likeCounts } = trpc.youtube.getLikeCounts.useQuery(
    { youtubeVideoId: videoId },
    { enabled: !!videoId }
  );

  const { data: subStatus } = trpc.youtube.getSubscriptionStatus.useQuery(
    { youtubeChannelId: video?.channelId || "" },
    { enabled: !!video?.channelId && !!clerkUser }
  );

  const { data: ytComments, isLoading: commentsLoading } =
    trpc.youtube.getComments.useQuery(
      { youtubeVideoId: videoId },
      { enabled: !!videoId }
    );

  const { data: commentCountData } = trpc.youtube.getCommentCount.useQuery(
    { youtubeVideoId: videoId },
    { enabled: !!videoId }
  );

  // ── Mutations ─────────────────────────────────────────────────────────────

  const toggleLike = trpc.youtube.toggleLike.useMutation({
    onSuccess: () => {
      utils.youtube.getLikeStatus.invalidate({ youtubeVideoId: videoId });
      utils.youtube.getLikeCounts.invalidate({ youtubeVideoId: videoId });
    },
  });

  const toggleSubscribe = trpc.youtube.toggleSubscribe.useMutation({
    onSuccess: () => {
      utils.youtube.getSubscriptionStatus.invalidate({
        youtubeChannelId: video?.channelId || "",
      });
    },
  });

  const addComment = trpc.youtube.addComment.useMutation({
    onSuccess: () => {
      setCommentText("");
      utils.youtube.getComments.invalidate({ youtubeVideoId: videoId });
      utils.youtube.getCommentCount.invalidate({ youtubeVideoId: videoId });
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleLike = useCallback(() => {
    if (!clerkUser) return;
    toggleLike.mutate({ youtubeVideoId: videoId, isLike: true });
  }, [clerkUser, videoId, toggleLike]);

  const handleDislike = useCallback(() => {
    if (!clerkUser) return;
    toggleLike.mutate({ youtubeVideoId: videoId, isLike: false });
  }, [clerkUser, videoId, toggleLike]);

  const handleSubscribe = useCallback(() => {
    if (!clerkUser || !video) return;
    toggleSubscribe.mutate({
      youtubeChannelId: video.channelId,
      youtubeChannelTitle: video.channelTitle,
      youtubeChannelThumbnail: video.channelThumbnail,
    });
  }, [clerkUser, video, toggleSubscribe]);

  const handleAddComment = useCallback(() => {
    if (!commentText.trim()) return;
    addComment.mutate({
      youtubeVideoId: videoId,
      content: commentText.trim(),
    });
  }, [commentText, videoId, addComment]);

  // ── Loading state ─────────────────────────────────────────────────────────

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
        <Button
          onClick={() => router.push("/feed")}
          variant="outline"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Feed
        </Button>
      </div>
    );
  }

  const neptubeLikes = likeCounts?.likeCount ?? 0;
  const neptubeDislikes = likeCounts?.dislikeCount ?? 0;
  const totalLikes = (video.likeCount ?? 0) + neptubeLikes;
  const neptubeCommentCount = commentCountData?.count ?? 0;

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main Content ────────────────────────────────────────────────── */}
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
              {/* Channel info + Subscribe */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={video.channelThumbnail} />
                  <AvatarFallback className="bg-red-500/10 text-red-500 font-semibold">
                    {video.channelTitle[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{video.channelTitle}</p>
                  <p className="text-xs text-muted-foreground">YouTube Channel</p>
                </div>

                {/* Subscribe Button */}
                <Button
                  variant={subStatus?.subscribed ? "outline" : "default"}
                  size="sm"
                  className={`gap-1.5 ml-2 ${
                    subStatus?.subscribed
                      ? "border-primary/30 text-muted-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                  onClick={handleSubscribe}
                  disabled={!clerkUser || toggleSubscribe.isPending}
                >
                  {subStatus?.subscribed ? (
                    <>
                      <BellOff className="h-3.5 w-3.5" />
                      Subscribed
                    </>
                  ) : (
                    <>
                      <Bell className="h-3.5 w-3.5" />
                      Subscribe
                    </>
                  )}
                </Button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {/* Like / Dislike pill */}
                <div className="flex items-center bg-muted/50 rounded-lg overflow-hidden">
                  <button
                    onClick={handleLike}
                    disabled={!clerkUser || toggleLike.isPending}
                    className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
                      likeStatus?.isLiked
                        ? "text-blue-500 bg-blue-500/10"
                        : "hover:bg-muted"
                    }`}
                  >
                    <ThumbsUp
                      className={`h-4 w-4 ${likeStatus?.isLiked ? "fill-blue-500" : ""}`}
                    />
                    <span className="text-sm font-medium">{formatCount(totalLikes)}</span>
                  </button>
                  <div className="w-px h-6 bg-border" />
                  <button
                    onClick={handleDislike}
                    disabled={!clerkUser || toggleLike.isPending}
                    className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
                      likeStatus?.isDisliked
                        ? "text-red-500 bg-red-500/10"
                        : "hover:bg-muted"
                    }`}
                  >
                    <ThumbsDown
                      className={`h-4 w-4 ${likeStatus?.isDisliked ? "fill-red-500" : ""}`}
                    />
                    {neptubeDislikes > 0 && (
                      <span className="text-sm font-medium">
                        {formatCount(neptubeDislikes)}
                      </span>
                    )}
                  </button>
                </div>

                {/* Share */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  {copied ? "Copied!" : "Share"}
                </Button>

                {/* View on YouTube */}
                <Link
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-red-500 border-red-500/30 hover:bg-red-500/10"
                  >
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
                {neptubeCommentCount > 0
                  ? `${neptubeCommentCount} NepTube comments`
                  : `${formatCount(video.commentCount)} YouTube comments`}
              </span>
              <span>
                {formatDistanceToNow(new Date(video.publishedAt), {
                  addSuffix: true,
                })}
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
                {video.tags.map((tag, index) => (
                  <Badge
                    key={`${tag}-${index}`}
                    variant="secondary"
                    className="text-xs rounded bg-red-500/5 text-red-500/70 border border-red-500/10 cursor-pointer hover:bg-red-500/10"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* ── NepTube Comments Section ──────────────────────────────── */}
            <div className="space-y-4 pt-2">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Comments
                {neptubeCommentCount > 0 && (
                  <span className="text-sm text-muted-foreground font-normal">
                    ({neptubeCommentCount})
                  </span>
                )}
              </h2>

              {/* Add comment */}
              {clerkUser ? (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={clerkUser.imageUrl} />
                    <AvatarFallback className="text-xs">
                      {clerkUser.firstName?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="min-h-[70px] text-sm resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      {commentText && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCommentText("")}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        size="sm"
                        disabled={!commentText.trim() || addComment.isPending}
                        onClick={handleAddComment}
                        className="gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    <Link
                      href="/sign-in"
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </Link>{" "}
                    to leave a comment
                  </p>
                </div>
              )}

              {/* Comment list */}
              {commentsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : ytComments && ytComments.length > 0 ? (
                <div className="space-y-4">
                  {ytComments.map((comment) => (
                    <YouTubeComment
                      key={comment.id}
                      comment={comment}
                      videoId={videoId}
                    />
                  ))}
                </div>
              ) : (
                <div className="glass-card rounded-xl p-6 text-center">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No NepTube comments yet. Be the first to share your thoughts!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar — Related Videos ──────────────────────────────────── */}
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {rv.channelTitle}
                  </p>
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