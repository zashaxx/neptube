"use client";

import { useEffect, useState } from "react";
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
  Captions,
  Loader2,
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

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

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

function CommentSection({ videoId }: { videoId: string }) {
  const [content, setContent] = useState("");
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
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {comment.content}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <button className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {comment.likeCount > 0 ? comment.likeCount : ""}
                  </button>
                  <button className="text-[10px] text-muted-foreground hover:text-foreground">
                    Reply
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
      </div>
    </Link>
  );
}

export default function VideoPage() {
  const params = useParams();
  const videoId = params.videoId as string;
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
  const { isSignedIn } = useAuth();
  const utils = trpc.useUtils();

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

  const { data: commentSummary } = trpc.videos.summarizeVideoComments.useQuery(
    { videoId },
    { enabled: !!videoId && showCommentSummary }
  );

  // Generate subtitle data URL from WebVTT content
  const subtitleDataUrl = video?.subtitlesVTT
    ? `data:text/vtt;charset=utf-8,${encodeURIComponent(video.subtitlesVTT)}`
    : null;

  const toggleSub = trpc.subscriptions.toggle.useMutation({
    onSuccess: () => {
      utils.subscriptions.isSubscribed.invalidate({ channelId: video?.user?.id ?? "" });
      utils.subscriptions.getCount.invalidate({ channelId: video?.user?.id ?? "" });
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

  const incrementViews = trpc.videos.incrementViews.useMutation();

  useEffect(() => {
    if (videoId) {
      incrementViews.mutate({ id: videoId });
      if (isSignedIn) {
        addToHistory.mutate({ videoId });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, isSignedIn]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatChapterTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

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
        <Link href="/feed">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Feed
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
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
          <div className="aspect-video bg-black rounded-xl overflow-hidden relative group/player">
            <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 group-hover/player:from-primary/30 group-hover/player:via-transparent group-hover/player:to-[hsl(190,80%,50%)]/30 transition-all duration-700 pointer-events-none" />
            {video.videoURL ? (
              <video
                src={video.videoURL}
                controls
                autoPlay
                className="w-full h-full relative z-10"
                poster={video.thumbnailURL || undefined}
                crossOrigin="anonymous"
              >
                {subtitleDataUrl && (
                  <track
                    kind="captions"
                    src={subtitleDataUrl}
                    srcLang="en"
                    label="English"
                    default
                  />
                )}
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <p>Video not available</p>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold tracking-tight">
            {video.title}
          </h1>

          {/* AI Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-primary/60" />
              {video.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[11px] px-2 py-0.5 rounded-md bg-primary/5 text-primary/80 border border-primary/10 hover:bg-primary/10 cursor-pointer"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

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

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={() => isSignedIn && likeVideo.mutate({ videoId, isLike: true })}
              >
                <ThumbsUp className="h-4 w-4" />
                {formatViewCount(video.likeCount)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={() => isSignedIn && likeVideo.mutate({ videoId, isLike: false })}
              >
                <ThumbsDown className="h-4 w-4" />
                {formatViewCount(video.dislikeCount)}
              </Button>

              {/* Share Dialog */}
              <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Share video</DialogTitle>
                    <DialogDescription>Copy the link to share this video.</DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={typeof window !== "undefined" ? window.location.href : ""}
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-muted"
                    />
                    <Button size="sm" onClick={handleShare} className="gap-1.5 rounded-lg">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Add to Playlist */}
              {isSignedIn && (
                <Dialog open={playlistOpen} onOpenChange={setPlaylistOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg">
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
                        <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
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
                          {addToPlaylist.isPending ? "Saving..." : "Add to Playlist"}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No playlists yet.{" "}
                        <Link href="/playlists" className="text-primary hover:underline">
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
                    <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg">
                      <Flag className="h-4 w-4" />
                      Report
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Report video</DialogTitle>
                      <DialogDescription>Help us understand the issue.</DialogDescription>
                    </DialogHeader>
                    <Select value={reportReason} onValueChange={setReportReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Spam or misleading">Spam or misleading</SelectItem>
                        <SelectItem value="Hateful or abusive content">Hateful or abusive</SelectItem>
                        <SelectItem value="Harmful or dangerous acts">Harmful content</SelectItem>
                        <SelectItem value="Sexual content">Sexual content</SelectItem>
                        <SelectItem value="Child safety">Child safety</SelectItem>
                        <SelectItem value="Copyright violation">Copyright violation</SelectItem>
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
                      <Button variant="outline" onClick={() => setReportOpen(false)}>
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
                        {createReport.isPending ? "Submitting..." : "Submit Report"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
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
                    onClick={() => toggleSub.mutate({ channelId: video.user.id })}
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
                  {video.chapters.map((chapter, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <span className="text-xs font-mono text-primary min-w-[40px]">
                        {formatChapterTime(chapter.time)}
                      </span>
                      <span className="text-sm">{chapter.title}</span>
                    </div>
                  ))}
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
        <aside className="space-y-4">
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