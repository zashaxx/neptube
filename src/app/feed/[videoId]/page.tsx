"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Flag,
  Eye,
  ArrowLeft,
  Tag,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Send,
  SmilePlus,
  Frown,
  Meh,
  Shield,
  Copy,
  Check,
  ListPlus,
  Clock,
  MessageSquareText,
  Loader2,
  Heart,
  Angry,
  Laugh,
  Zap,
  AlertCircle,
  Globe,
  Key,
  BarChart3,
  Wand2,
  Bot,
  PictureInPicture2,
  Download,
  BookmarkPlus,
  BookmarkCheck,
  Maximize,
  Minimize,
  Code2,
  Keyboard,
  Reply,
  ChevronRight,
  Captions,
  CaptionsOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@clerk/nextjs";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useMiniPlayer } from "@/components/mini-player";
import { WhyRecommended } from "@/components/why-recommended";

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Sentiment & Emotion Badges ─────────────────────────────────────────

function SentimentBadge({
  sentiment,
}: {
  sentiment: "positive" | "negative" | "neutral" | null;
}) {
  if (!sentiment) return null;
  const config = {
    positive: {
      icon: SmilePlus,
      label: "Positive",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    negative: {
      icon: Frown,
      label: "Negative",
      className: "bg-red-500/10 text-red-600 border-red-500/20",
    },
    neutral: {
      icon: Meh,
      label: "Neutral",
      className: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    },
  };
  const c = config[sentiment];
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border ${c.className}`}
    >
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function EmotionBadge({ emotion }: { emotion: string | null }) {
  if (!emotion || emotion === "neutral") return null;
  const emotionConfig: Record<string, { icon: typeof Heart; label: string; className: string }> = {
    joy: { icon: Laugh, label: "Joy", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
    anger: { icon: Angry, label: "Anger", className: "bg-red-500/10 text-red-600 border-red-500/20" },
    sadness: { icon: Frown, label: "Sad", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    surprise: { icon: Zap, label: "Surprise", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    fear: { icon: AlertCircle, label: "Fear", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
    disgust: { icon: Frown, label: "Disgust", className: "bg-green-500/10 text-green-600 border-green-500/20" },
    love: { icon: Heart, label: "Love", className: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
  };
  const c = emotionConfig[emotion];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border ${c.className}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

// ─── Comment Reply Thread ───────────────────────────────────────────────

function CommentReplies({
  parentId,
  videoId,
}: {
  parentId: string;
  videoId: string;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [showReplyForm, setShowReplyForm] = useState(false);
  const utils = trpc.useUtils();

  const { data: replies, isLoading } = trpc.comments.getReplies.useQuery(
    { parentId, limit: 10 },
    { enabled: showReplies }
  );

  const createReply = trpc.comments.create.useMutation({
    onSuccess: () => {
      setReplyContent("");
      setShowReplyForm(false);
      utils.comments.getReplies.invalidate({ parentId });
      utils.comments.getByVideo.invalidate({ videoId });
    },
  });

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    createReply.mutate({
      videoId,
      content: replyContent.trim(),
      parentId,
    });
  };

  return (
    <div className="mt-1">
      <div className="flex items-center gap-2">
        {/* Reply button */}
        {!showReplyForm && (
          <button
            onClick={() => setShowReplyForm(true)}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            Reply
          </button>
        )}

        {/* Toggle replies */}
        <button
          onClick={() => setShowReplies(!showReplies)}
          className="text-[11px] text-primary font-medium flex items-center gap-1 hover:underline"
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${showReplies ? "rotate-90" : ""}`}
          />
          {showReplies ? "Hide replies" : "View replies"}
        </button>
      </div>

      {/* Reply form */}
      {showReplyForm && (
        <form onSubmit={handleReplySubmit} className="mt-2 ml-2">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Add a reply..."
            className="min-h-[60px] text-sm rounded-lg resize-none"
            maxLength={2000}
          />
          <div className="flex justify-end gap-2 mt-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowReplyForm(false);
                setReplyContent("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!replyContent.trim() || createReply.isPending}
              className="gap-1 rounded-lg"
            >
              <Reply className="h-3 w-3" />
              {createReply.isPending ? "Posting..." : "Reply"}
            </Button>
          </div>
        </form>
      )}

      {/* Replies list */}
      {showReplies && (
        <div className="mt-2 ml-2 space-y-3 border-l-2 border-primary/10 pl-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading replies...
            </div>
          ) : replies && replies.length > 0 ? (
            replies.map((reply) => (
              <div key={reply.id} className="flex gap-2">
                <Avatar className="h-6 w-6 rounded-md flex-shrink-0">
                  <AvatarImage src={reply.user.imageURL} />
                  <AvatarFallback className="rounded-md bg-primary/10 text-primary text-[10px]">
                    {reply.user.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-medium">
                      {reply.user.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(reply.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-[13px] text-foreground/90 leading-relaxed">
                    {reply.content}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <ThumbsUp className="h-2.5 w-2.5" />
                      {reply.likeCount > 0 ? reply.likeCount : ""}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-muted-foreground">No replies yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Comment Section (threaded) ─────────────────────────────────────────

function CommentSection({ videoId }: { videoId: string }) {
  const [content, setContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replySuggestions, setReplySuggestions] = useState<string[]>([]);
  const utils = trpc.useUtils();

  const { data: comments, isLoading } = trpc.comments.getByVideo.useQuery({
    videoId,
    limit: 30,
  });

  const createComment = trpc.comments.create.useMutation({
    onSuccess: () => {
      setContent("");
      utils.comments.getByVideo.invalidate({ videoId });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createComment.mutate({ videoId, content: content.trim() });
  };

  return (
    <div>
      <h2 className="font-semibold text-sm mb-4">
        Comments{" "}
        {comments?.length ? (
          <span className="text-muted-foreground font-normal">
            ({comments.length})
          </span>
        ) : null}
      </h2>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[80px] rounded-lg mb-2 resize-none"
          maxLength={2000}
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" />
            AI moderation active — toxic comments are auto-filtered
          </p>
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim() || createComment.isPending}
            className="gap-1.5 rounded-lg"
          >
            <Send className="h-3.5 w-3.5" />
            {createComment.isPending ? "Posting..." : "Comment"}
          </Button>
        </div>
      </form>

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments?.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          No comments yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="space-y-4">
          {comments?.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="h-8 w-8 rounded-lg flex-shrink-0">
                <AvatarImage src={comment.user.imageURL} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs">
                  {comment.user.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium">
                    {comment.user.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  <SentimentBadge sentiment={comment.sentiment} />
                  <EmotionBadge emotion={comment.emotion ?? null} />
                  {comment.isSpam && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <Bot className="h-3 w-3" />
                      Spam
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {comment.content}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <button className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {comment.likeCount > 0 ? comment.likeCount : ""}
                  </button>
                  <button
                    className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1"
                    onClick={async () => {
                      setReplyingTo(comment.id);
                      setReplySuggestions([]);
                      try {
                        const result =
                          await utils.client.comments.getReplySuggestions.query({
                            commentId: comment.id,
                            videoId,
                          });
                        setReplySuggestions(result.suggestions);
                      } catch {
                        setReplySuggestions([]);
                      }
                    }}
                  >
                    <Wand2 className="h-3 w-3" />
                    AI Reply
                  </button>
                </div>

                {/* AI Reply Suggestions */}
                {replyingTo === comment.id && replySuggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {replySuggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-primary/5 text-primary/80 border border-primary/10 hover:bg-primary/10 transition-colors"
                        onClick={() => {
                          setContent(suggestion);
                          setReplyingTo(null);
                          setReplySuggestions([]);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {/* Threaded Replies */}
                <CommentReplies parentId={comment.id} videoId={videoId} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Recommendation Card ────────────────────────────────────────────────

function RecommendationCard({
  video,
}: {
  video: {
    id: string;
    title: string;
    thumbnailURL: string | null;
    viewCount: number;
    createdAt: Date | string;
    tags: string[] | null;
    user: { id: string; name: string; imageURL: string };
    relevanceScore: number;
  };
}) {
  return (
    <Link href={`/feed/${video.id}`} className="group flex gap-3">
      <div className="relative w-40 aspect-video bg-muted rounded-lg overflow-hidden flex-shrink-0 thumbnail-hover">
        {video.thumbnailURL ? (
          <Image
            src={video.thumbnailURL}
            alt={video.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <span className="text-primary font-bold">
              {video.title[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{video.user.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatViewCount(video.viewCount)} views
        </p>
        {video.relevanceScore > 0.5 && (
          <Badge
            variant="secondary"
            className="mt-1 text-[10px] gap-1 px-1.5 py-0"
          >
            <Sparkles className="h-2.5 w-2.5" />
            {Math.round(video.relevanceScore * 100)}% match
          </Badge>
        )}
        <WhyRecommended videoId={video.id} />
      </div>
    </Link>
  );
}

// ─── Chapter Progress Bar ───────────────────────────────────────────────

function ChapterProgressBar({
  chapters,
  currentTime,
  duration,
  onSeek,
}: {
  chapters: { time: number; title: string }[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}) {
  if (!chapters.length || !duration) return null;

  return (
    <div className="relative w-full h-1.5 bg-muted rounded-full mt-1 group/progress cursor-pointer">
      {/* Progress fill */}
      <div
        className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
        style={{ width: `${(currentTime / duration) * 100}%` }}
      />

      {/* Chapter markers */}
      {chapters.map((chapter, i) => {
        const pos = (chapter.time / duration) * 100;
        return (
          <button
            key={i}
            className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-white/80 rounded-full hover:h-4 hover:bg-white transition-all z-10"
            style={{ left: `${pos}%` }}
            onClick={() => onSeek(chapter.time)}
            title={`${formatTime(chapter.time)} — ${chapter.title}`}
          />
        );
      })}

      {/* Click to seek */}
      <div
        className="absolute inset-0"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          onSeek(percent * duration);
        }}
      />
    </div>
  );
}

// ─── Keyboard Shortcuts Modal ───────────────────────────────────────────

function ShortcutsHelpDialog() {
  const shortcuts = [
    { key: "Space / K", desc: "Play / Pause" },
    { key: "F", desc: "Toggle fullscreen" },
    { key: "M", desc: "Toggle mute" },
    { key: "J", desc: "Rewind 10s" },
    { key: "L", desc: "Forward 10s" },
    { key: "←/→", desc: "Seek ±5s" },
    { key: "↑/↓", desc: "Volume ±10%" },
    { key: "T", desc: "Theater mode" },
    { key: "I", desc: "Mini player" },
    { key: "0-9", desc: "Seek to 0%-90%" },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg">
          <Keyboard className="h-4 w-4" />
          <span className="hidden sm:inline">Shortcuts</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-muted text-xs font-mono">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Video Page ────────────────────────────────────────────────────

export default function VideoPage() {
  const params = useParams();
  const videoId = params.videoId as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [showChapters, setShowChapters] = useState(false);
  const [showCommentSummary, setShowCommentSummary] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [shareTimestamp, setShareTimestamp] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const { isSignedIn } = useAuth();
  const utils = trpc.useUtils();
  const { openMiniPlayer } = useMiniPlayer();
  const progressSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Queries ──────────────────────────────────────────────────────

  const {
    data: video,
    isLoading,
    error,
  } = trpc.videos.getById.useQuery({ id: videoId }, { enabled: !!videoId });

  const { data: recommendations } = trpc.videos.getRecommendations.useQuery(
    { videoId, limit: 6 },
    { enabled: !!videoId }
  );

  const { data: isSubscribed } = trpc.subscriptions.isSubscribed.useQuery(
    { channelId: video?.user?.id ?? "" },
    { enabled: !!video?.user?.id && !!isSignedIn }
  );

  const { data: subCount } = trpc.subscriptions.getCount.useQuery(
    { channelId: video?.user?.id ?? "" },
    { enabled: !!video?.user?.id }
  );

  const { data: myPlaylists } = trpc.playlists.getMyPlaylists.useQuery(
    undefined,
    { enabled: !!isSignedIn && playlistOpen }
  );

  const { data: isInWatchLater } = trpc.playlists.isInWatchLater.useQuery(
    { videoId },
    { enabled: !!isSignedIn && !!videoId }
  );

  const addToWatchLater = trpc.playlists.addToWatchLater.useMutation({
    onSuccess: () => {
      utils.playlists.isInWatchLater.invalidate({ videoId });
    },
  });

  const { data: commentSummary } = trpc.videos.summarizeVideoComments.useQuery(
    { videoId },
    { enabled: !!videoId && showCommentSummary }
  );

  // Watch progress (resume)
  const { data: watchProgress } = trpc.history.getWatchProgress.useQuery(
    { videoId },
    { enabled: !!isSignedIn && !!videoId }
  );

  // Generate subtitle data URL from WebVTT content
  const subtitleDataUrl = video?.subtitlesVTT
    ? `data:text/vtt;charset=utf-8,${encodeURIComponent(video.subtitlesVTT)}`
    : null;

  // ─── Mutations ────────────────────────────────────────────────────

  const toggleSub = trpc.subscriptions.toggle.useMutation({
    onSuccess: () => {
      utils.subscriptions.isSubscribed.invalidate({
        channelId: video?.user?.id ?? "",
      });
      utils.subscriptions.getCount.invalidate({
        channelId: video?.user?.id ?? "",
      });
    },
  });

  const likeVideo = trpc.videos.toggleLike.useMutation({
    onSuccess: () => utils.videos.getById.invalidate({ id: videoId }),
  });

  const createReport = trpc.reports.create.useMutation({
    onSuccess: () => {
      setReportOpen(false);
      setReportReason("");
      setReportDescription("");
    },
  });

  const addToPlaylist = trpc.playlists.addVideo.useMutation({
    onSuccess: () => {
      setPlaylistOpen(false);
      setSelectedPlaylist("");
    },
  });

  const addToHistory = trpc.history.addToHistory.useMutation();
  const updateProgress = trpc.history.updateProgress.useMutation();
  const incrementViews = trpc.videos.incrementViews.useMutation();

  // ─── Effects ──────────────────────────────────────────────────────

  // Increment views + add to history
  useEffect(() => {
    if (videoId) {
      incrementViews.mutate({ id: videoId });
      if (isSignedIn) {
        addToHistory.mutate({ videoId });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, isSignedIn]);

  // Resume from watch progress
  useEffect(() => {
    if (
      watchProgress?.watchDuration &&
      watchProgress.watchDuration > 5 &&
      videoRef.current
    ) {
      const vid = videoRef.current;
      const resumeTime = watchProgress.watchDuration;
      const handler = () => {
        if (resumeTime && vid.duration && resumeTime < vid.duration - 10) {
          vid.currentTime = resumeTime;
        }
        vid.removeEventListener("loadedmetadata", handler);
      };
      if (vid.readyState >= 1) {
        handler();
      } else {
        vid.addEventListener("loadedmetadata", handler);
      }
    }
  }, [watchProgress]);

  // Periodic progress save (every 10 seconds while playing)
  useEffect(() => {
    if (!isSignedIn || !videoId) return;

    const saveProgress = () => {
      const vid = videoRef.current;
      if (vid && !vid.paused && vid.currentTime > 0) {
        updateProgress.mutate({
          videoId,
          watchDuration: Math.floor(vid.currentTime),
        });
      }
    };

    progressSaveRef.current = setInterval(saveProgress, 10000);

    return () => {
      if (progressSaveRef.current) {
        clearInterval(progressSaveRef.current);
      }
      saveProgress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, isSignedIn]);

  // Track video time for chapters/progress bar
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleTimeUpdate = () => setCurrentTime(vid.currentTime);
    const handleDurationChange = () => setVideoDuration(vid.duration);

    vid.addEventListener("timeupdate", handleTimeUpdate);
    vid.addEventListener("durationchange", handleDurationChange);
    vid.addEventListener("loadedmetadata", handleDurationChange);

    return () => {
      vid.removeEventListener("timeupdate", handleTimeUpdate);
      vid.removeEventListener("durationchange", handleDurationChange);
      vid.removeEventListener("loadedmetadata", handleDurationChange);
    };
  }, [video?.videoURL]);

  // ─── Keyboard Shortcuts ───────────────────────────────────────────

  const { showOverlay } = useKeyboardShortcuts({
    videoRef,
    onToggleTheater: () => setTheaterMode((prev) => !prev),
    onToggleMiniPlayer: () => {
      if (video?.videoURL) {
        openMiniPlayer({
          id: videoId,
          title: video.title,
          videoURL: video.videoURL,
          thumbnailURL: video.thumbnailURL,
          currentTime: videoRef.current?.currentTime ?? 0,
        });
      }
    },
  });

  // ─── Callbacks ────────────────────────────────────────────────────

  const handleShare = useCallback(() => {
    let url = typeof window !== "undefined" ? window.location.href : "";
    if (shareTimestamp && currentTime > 0) {
      const baseUrl = url.split("?")[0];
      url = `${baseUrl}?t=${Math.floor(currentTime)}`;
    }
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareTimestamp, currentTime]);

  const getEmbedCode = useCallback(() => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    let embedUrl = `${baseUrl}/embed/${videoId}`;
    if (shareTimestamp && currentTime > 0) {
      embedUrl += `?t=${Math.floor(currentTime)}`;
    }
    return `<iframe width="560" height="315" src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`;
  }, [videoId, shareTimestamp, currentTime]);

  const seekToChapter = useCallback((time: number) => {
    const el = videoRef.current;
    if (el) {
      el.currentTime = time;
      el.play().catch(() => {});
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else {
        await el.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch (err) {
      console.error("PiP failed:", err);
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!video?.videoURL) return;
    const a = document.createElement("a");
    a.href = video.videoURL;
    a.download = `${video.title || "video"}.mp4`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [video?.videoURL, video?.title]);

  const toggleCaptions = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const track = vid.textTracks[0];
    if (track) {
      if (captionsEnabled) {
        track.mode = "hidden";
        setCaptionsEnabled(false);
      } else {
        track.mode = "showing";
        setCaptionsEnabled(true);
      }
    }
  }, [captionsEnabled]);

  const handleMiniPlayer = useCallback(() => {
    if (video?.videoURL) {
      openMiniPlayer({
        id: videoId,
        title: video.title,
        videoURL: video.videoURL,
        thumbnailURL: video.thumbnailURL,
        currentTime: videoRef.current?.currentTime ?? 0,
      });
    }
  }, [video, videoId, openMiniPlayer]);

  // ─── Loading / Error ──────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex gap-3 items-center">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-xl font-semibold mb-2">Video not found</h1>
        <p className="text-muted-foreground text-sm mb-4">
          This video may have been removed or doesn&apos;t exist.
        </p>
        {error && (
          <p className="text-red-500 text-xs mb-4 max-w-md text-center font-mono bg-red-500/5 border border-red-500/20 rounded-lg p-3">
            Error: {error.message}
          </p>
        )}
        <Link href="/feed">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Feed
          </Button>
        </Link>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div
      className={`mx-auto p-4 transition-all duration-300 ${
        theaterMode ? "max-w-full" : "max-w-6xl"
      }`}
    >
      <div
        className={`grid gap-6 ${
          theaterMode
            ? "grid-cols-1"
            : "grid-cols-1 lg:grid-cols-[1fr_340px]"
        }`}
      >
        {/* Main content */}
        <div className="space-y-5">
          {/* NSFW Warning */}
          {video.isNsfw && (
            <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">NSFW Content Detected</p>
                <p className="text-xs opacity-80">
                  This video has been flagged by our AI as potentially
                  inappropriate (confidence:{" "}
                  {Math.round((video.nsfwScore ?? 0) * 100)}%)
                </p>
              </div>
            </div>
          )}

          {/* Video Player */}
          <div
            className={`w-full bg-black rounded-xl overflow-hidden relative group/player ${
              theaterMode ? "max-h-[85vh]" : ""
            }`}
          >
            <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 group-hover/player:from-primary/30 group-hover/player:via-transparent group-hover/player:to-[hsl(190,80%,50%)]/30 transition-all duration-700 pointer-events-none z-20" />

            {/* Keyboard shortcut overlay */}
            {showOverlay && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <div className="bg-black/70 text-white text-lg font-semibold px-6 py-3 rounded-xl animate-fade-in">
                  {showOverlay}
                </div>
              </div>
            )}

            {video.videoURL ? (
              <video
                ref={videoRef}
                src={video.videoURL}
                controls
                autoPlay
                className={`w-full object-contain bg-black relative z-10 ${
                  theaterMode ? "max-h-[85vh] aspect-auto" : "aspect-video"
                }`}
                poster={video.thumbnailURL || undefined}
                crossOrigin="anonymous"
              >
                {subtitleDataUrl && (
                  <track
                    kind="captions"
                    src={subtitleDataUrl}
                    srcLang={video.language || "en"}
                    label={video.languageName || "English"}
                    default={captionsEnabled}
                  />
                )}
              </video>
            ) : (
              <div className="w-full aspect-video flex items-center justify-center text-white">
                <p>Video not available</p>
              </div>
            )}
          </div>

          {/* Chapter progress bar (below video) */}
          {video.chapters && video.chapters.length > 0 && (
            <ChapterProgressBar
              chapters={video.chapters}
              currentTime={currentTime}
              duration={videoDuration}
              onSeek={seekToChapter}
            />
          )}

          {/* Resume indicator */}
          {watchProgress?.watchDuration &&
            watchProgress.watchDuration > 5 &&
            currentTime < 3 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <Clock className="h-4 w-4 text-primary" />
                Resuming from {formatTime(watchProgress.watchDuration)}
              </div>
            )}

          {/* Title */}
          <h1 className="text-xl font-bold tracking-tight">{video.title}</h1>

          {/* AI Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-primary/60" />
              {video.tags.map((tag, index) => (
                <Badge
                  key={`${tag}-${index}`}
                  variant="secondary"
                  className="text-[11px] px-2 py-0.5 rounded-md bg-primary/5 text-primary/80 border border-primary/10 hover:bg-primary/10 cursor-pointer"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* ML Metadata Row */}
          <div className="flex flex-wrap items-center gap-3">
            {video.languageName && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border bg-blue-500/5 text-blue-600 border-blue-500/15">
                <Globe className="h-3 w-3" />
                {video.languageName}
              </span>
            )}
            {video.qualityScore !== null &&
              video.qualityScore !== undefined && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${
                    video.qualityScore >= 70
                      ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/15"
                      : video.qualityScore >= 40
                        ? "bg-yellow-500/5 text-yellow-600 border-yellow-500/15"
                        : "bg-red-500/5 text-red-600 border-red-500/15"
                  }`}
                >
                  <BarChart3 className="h-3 w-3" />
                  Quality: {video.qualityScore}/100
                </span>
              )}
            {video.keywords && video.keywords.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <Key className="h-3 w-3 text-muted-foreground/60" />
                {video.keywords.slice(0, 6).map((kw) => (
                  <Badge
                    key={kw}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 rounded bg-muted/30 text-muted-foreground border-border/50"
                  >
                    {kw}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Stats and Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>{formatViewCount(video.viewCount)} views</span>
              <span>·</span>
              <span>
                {formatDistanceToNow(new Date(video.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={() =>
                  isSignedIn && likeVideo.mutate({ videoId, isLike: true })
                }
              >
                <ThumbsUp className="h-4 w-4" />
                {formatViewCount(video.likeCount)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={() =>
                  isSignedIn && likeVideo.mutate({ videoId, isLike: false })
                }
              >
                <ThumbsDown className="h-4 w-4" />
                {formatViewCount(video.dislikeCount)}
              </Button>

              {/* Enhanced Share Dialog */}
              <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-lg"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Share video</DialogTitle>
                    <DialogDescription>
                      Share or embed this video.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Timestamp toggle */}
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareTimestamp}
                      onChange={(e) => setShareTimestamp(e.target.checked)}
                      className="rounded"
                    />
                    Start at{" "}
                    <span className="font-mono text-primary">
                      {formatTime(currentTime)}
                    </span>
                  </label>

                  {/* Copy link */}
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={
                        typeof window !== "undefined"
                          ? shareTimestamp && currentTime > 0
                            ? `${window.location.href.split("?")[0]}?t=${Math.floor(currentTime)}`
                            : window.location.href
                          : ""
                      }
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-muted"
                    />
                    <Button
                      size="sm"
                      onClick={handleShare}
                      className="gap-1.5 rounded-lg"
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>

                  {/* Embed code */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Code2 className="h-4 w-4" />
                      Embed
                    </label>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={getEmbedCode()}
                        className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-muted font-mono h-16 resize-none"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-1 right-1 h-7 px-2"
                        onClick={() => {
                          navigator.clipboard.writeText(getEmbedCode());
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Save to Playlist */}
              {isSignedIn && (
                <Dialog open={playlistOpen} onOpenChange={setPlaylistOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 rounded-lg"
                    >
                      <ListPlus className="h-4 w-4" />
                      Save
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Save to playlist</DialogTitle>
                    </DialogHeader>
                    {myPlaylists && myPlaylists.length > 0 ? (
                      <div className="space-y-3">
                        <Select
                          value={selectedPlaylist}
                          onValueChange={setSelectedPlaylist}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a playlist" />
                          </SelectTrigger>
                          <SelectContent>
                            {myPlaylists.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          className="w-full rounded-lg"
                          disabled={!selectedPlaylist || addToPlaylist.isPending}
                          onClick={() => {
                            if (selectedPlaylist) {
                              addToPlaylist.mutate({
                                playlistId: selectedPlaylist,
                                videoId,
                              });
                            }
                          }}
                        >
                          {addToPlaylist.isPending
                            ? "Saving..."
                            : "Add to Playlist"}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No playlists yet.{" "}
                        <Link
                          href="/playlists"
                          className="text-primary hover:underline"
                        >
                          Create one
                        </Link>
                      </p>
                    )}
                  </DialogContent>
                </Dialog>
              )}

              {/* Report Dialog */}
              {isSignedIn && (
                <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 rounded-lg"
                    >
                      <Flag className="h-4 w-4" />
                      Report
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Report video</DialogTitle>
                      <DialogDescription>
                        Help us understand the issue.
                      </DialogDescription>
                    </DialogHeader>
                    <Select
                      value={reportReason}
                      onValueChange={setReportReason}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Spam or misleading">
                          Spam or misleading
                        </SelectItem>
                        <SelectItem value="Hateful or abusive content">
                          Hateful or abusive
                        </SelectItem>
                        <SelectItem value="Harmful or dangerous acts">
                          Harmful content
                        </SelectItem>
                        <SelectItem value="Sexual content">
                          Sexual content
                        </SelectItem>
                        <SelectItem value="Child safety">
                          Child safety
                        </SelectItem>
                        <SelectItem value="Copyright violation">
                          Copyright violation
                        </SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Describe the issue (optional)..."
                      className="min-h-[80px]"
                    />
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setReportOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={!reportReason || createReport.isPending}
                        onClick={() => {
                          createReport.mutate({
                            targetType: "video",
                            targetId: videoId,
                            reason: reportReason,
                            description: reportDescription || undefined,
                          });
                        }}
                      >
                        {createReport.isPending
                          ? "Submitting..."
                          : "Submit Report"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Watch Later */}
              {isSignedIn && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-lg"
                  onClick={() => addToWatchLater.mutate({ videoId })}
                  disabled={addToWatchLater.isPending}
                >
                  {isInWatchLater ? (
                    <BookmarkCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <BookmarkPlus className="h-4 w-4" />
                  )}
                  {isInWatchLater ? "Saved" : "Watch Later"}
                </Button>
              )}

              {/* Subtitles/CC Toggle */}
              {subtitleDataUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-lg"
                  onClick={toggleCaptions}
                >
                  {captionsEnabled ? (
                    <Captions className="h-4 w-4 text-primary" />
                  ) : (
                    <CaptionsOff className="h-4 w-4" />
                  )}
                  CC
                </Button>
              )}

              {/* Theater Mode */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={() => setTheaterMode(!theaterMode)}
              >
                {theaterMode ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
                {theaterMode ? "Default" : "Theater"}
              </Button>

              {/* Mini Player */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={handleMiniPlayer}
              >
                <PictureInPicture2 className="h-4 w-4" />
                Mini
              </Button>

              {/* PiP */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={togglePiP}
              >
                <PictureInPicture2 className="h-4 w-4" />
                {isPiPActive ? "Exit PiP" : "PiP"}
              </Button>

              {/* Download */}
              {video.videoURL && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-lg"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}

              {/* Keyboard Shortcuts */}
              <ShortcutsHelpDialog />
            </div>
          </div>

          {/* Channel Info */}
          <div className="flex items-start gap-4 p-4 glass-card rounded-xl">
            <Link href={`/channel/${video.user.id}`}>
              <Avatar className="h-11 w-11 rounded-lg">
                <AvatarImage src={video.user.imageURL} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                  {video.user.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/channel/${video.user.id}`}
                    className="font-semibold text-sm hover:text-primary transition-colors"
                  >
                    {video.user.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatViewCount(Number(subCount ?? 0))} subscribers
                  </p>
                </div>
                {isSignedIn && (
                  <Button
                    size="sm"
                    className="rounded-lg"
                    variant={isSubscribed ? "outline" : "default"}
                    onClick={() =>
                      toggleSub.mutate({ channelId: video.user.id })
                    }
                    disabled={toggleSub.isPending}
                  >
                    {isSubscribed ? "Subscribed" : "Subscribe"}
                  </Button>
                )}
              </div>
              {video.description && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {video.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AI Summary */}
          {video.aiSummary && (
            <div className="glass-card border-primary/15 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Summary
                </div>
                {showSummary ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {showSummary && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {video.aiSummary}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Chapters */}
          {video.chapters && video.chapters.length > 0 && (
            <div className="glass-card rounded-xl overflow-hidden">
              <button
                onClick={() => setShowChapters(!showChapters)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Chapters ({video.chapters.length})
                </div>
                {showChapters ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {showChapters && (
                <div className="px-4 pb-4 space-y-1.5">
                  {video.chapters.map((chapter, i) => {
                    const nextChapterTime =
                      video.chapters && i < video.chapters.length - 1
                        ? video.chapters[i + 1].time
                        : videoDuration;
                    const isCurrentChapter =
                      currentTime >= chapter.time &&
                      currentTime < nextChapterTime;

                    return (
                      <button
                        key={i}
                        onClick={() => seekToChapter(chapter.time)}
                        className={`flex items-center gap-3 py-1.5 px-2 rounded-md cursor-pointer transition-colors w-full text-left ${
                          isCurrentChapter
                            ? "bg-primary/15 text-primary"
                            : "hover:bg-primary/10"
                        }`}
                      >
                        <span className="text-xs font-mono min-w-[40px]">
                          {formatTime(chapter.time)}
                        </span>
                        <span className="text-sm">{chapter.title}</span>
                        {isCurrentChapter && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 ml-auto"
                          >
                            Now
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Transcript */}
          {video.transcript && (
            <div className="glass-card rounded-xl overflow-hidden">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Transcript
                </div>
                {showTranscript ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {showTranscript && (
                <div className="px-4 pb-4 max-h-64 overflow-y-auto">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {video.transcript}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Comment Summary (AI) */}
          <div className="glass-card rounded-xl overflow-hidden">
            <button
              onClick={() => setShowCommentSummary(!showCommentSummary)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquareText className="h-4 w-4 text-primary" />
                AI Comment Summary
              </div>
              {showCommentSummary ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {showCommentSummary && (
              <div className="px-4 pb-4">
                {commentSummary?.summary ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {commentSummary.summary}
                  </p>
                ) : commentSummary?.commentCount !== undefined &&
                  commentSummary.commentCount < 3 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Need at least 3 comments to generate a summary.
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing comments...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="border-t border-border/50 pt-5">
            <CommentSection videoId={videoId} />
          </div>
        </div>

        {/* Sidebar — Recommendations */}
        <aside
          className={`space-y-4 ${theaterMode ? "max-w-md mx-auto" : ""}`}
        >
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Recommended for you
          </h3>
          {recommendations && recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <RecommendationCard key={rec.id} video={rec} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-40 aspect-video rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
