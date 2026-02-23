"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { useAuth } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import {
  ThumbsUp,
  MessageCircle,
  ImagePlus,
  BarChart3,
  Send,
  Users,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from "next/image";
import { toast } from "sonner";

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function CreatePostForm() {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"text" | "image" | "poll">("text");
  const [imageURL, setImageURL] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const utils = trpc.useUtils();

  const createPost = trpc.community.create.useMutation({
    onSuccess: () => {
      setContent("");
      setImageURL("");
      setPollOptions(["", ""]);
      setPostType("text");
      utils.community.getAll.invalidate();
      utils.community.getFeed.invalidate();
    },
  });

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;

    const input: {
      content: string;
      type: "text" | "image" | "poll";
      imageURL?: string;
      pollOptions?: string[];
    } = {
      content: content.trim(),
      type: postType,
    };

    if (postType === "image" && imageURL.trim()) {
      input.imageURL = imageURL.trim();
    }

    if (postType === "poll") {
      const validOptions = pollOptions.filter((o) => o.trim());
      if (validOptions.length >= 2) {
        input.pollOptions = validOptions;
      }
    }

    createPost.mutate(input);
  };

  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Select
          value={postType}
          onValueChange={(v: "text" | "image" | "poll") => setPostType(v)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" />
                Text
              </span>
            </SelectItem>
            <SelectItem value="image">
              <span className="flex items-center gap-1.5">
                <ImagePlus className="h-3.5 w-3.5" />
                Image
              </span>
            </SelectItem>
            <SelectItem value="poll">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Poll
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share something with your community..."
        className="min-h-[100px] resize-none rounded-lg"
        maxLength={3000}
      />

      {postType === "image" && (
        <Input
          value={imageURL}
          onChange={(e) => setImageURL(e.target.value)}
          placeholder="Image URL..."
          className="rounded-lg"
        />
      )}

      {postType === "poll" && (
        <div className="space-y-2">
          {pollOptions.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={option}
                onChange={(e) => {
                  const newOptions = [...pollOptions];
                  newOptions[index] = e.target.value;
                  setPollOptions(newOptions);
                }}
                placeholder={`Option ${index + 1}`}
                className="rounded-lg"
                maxLength={200}
              />
              {pollOptions.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePollOption(index)}
                  className="text-muted-foreground"
                >
                  ×
                </Button>
              )}
            </div>
          ))}
          {pollOptions.length < 6 && (
            <Button
              variant="outline"
              size="sm"
              onClick={addPollOption}
              className="rounded-lg"
            >
              + Add option
            </Button>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || createPost.isPending}
          className="gap-2 rounded-lg"
        >
          <Send className="h-4 w-4" />
          {createPost.isPending ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}

function PollDisplay({
  options,
  postId,
}: {
  options: { id: string; text: string; voteCount: number }[];
  postId: string;
}) {
  const { isSignedIn } = useAuth();
  const utils = trpc.useUtils();

  const vote = trpc.community.vote.useMutation({
    onSuccess: () => {
      utils.community.getAll.invalidate();
      utils.community.getFeed.invalidate();
    },
  });

  const totalVotes = options.reduce((sum, o) => sum + o.voteCount, 0);

  return (
    <div className="space-y-2 mt-3">
      {options.map((option) => {
        const percentage =
          totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;

        return (
          <button
            key={option.id}
            onClick={() =>
              isSignedIn && vote.mutate({ postId, optionId: option.id })
            }
            disabled={vote.isPending}
            className="w-full relative overflow-hidden rounded-lg border border-border p-3 text-left hover:border-primary/30 transition-colors"
          >
            <div
              className="absolute inset-0 bg-primary/10 transition-all"
              style={{ width: `${percentage}%` }}
            />
            <div className="relative flex items-center justify-between">
              <span className="text-sm font-medium">{option.text}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {percentage}% ({option.voteCount})
              </span>
            </div>
          </button>
        );
      })}
      <p className="text-xs text-muted-foreground text-center">
        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function PostCard({
  post,
}: {
  post: {
    id: string;
    type: string;
    content: string;
    imageURL: string | null;
    likeCount: number;
    commentCount: number;
    createdAt: Date | string;
    user: { id: string; clerkId: string; name: string; imageURL: string };
    pollOptions: { id: string; text: string; voteCount: number }[];
  };
}) {
  const { isSignedIn, userId } = useAuth();
  const utils = trpc.useUtils();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Track like state
  const { data: hasLiked } = trpc.community.hasLiked.useQuery(
    { postId: post.id },
    { enabled: !!isSignedIn }
  );

  const toggleLike = trpc.community.toggleLike.useMutation({
    onSuccess: (data) => {
      utils.community.getAll.invalidate();
      utils.community.getFeed.invalidate();
      utils.community.hasLiked.invalidate({ postId: post.id });
      toast.success(data.liked ? "Liked!" : "Unliked");
    },
  });

  const deletePost = trpc.community.delete.useMutation({
    onSuccess: () => {
      utils.community.getAll.invalidate();
      utils.community.getFeed.invalidate();
      toast.success("Post deleted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete post");
    },
  });

  // Check if current user owns this post
  const isOwner = isSignedIn && userId === post.user.clerkId;

  return (
    <>
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 rounded-lg">
            <AvatarImage src={post.user.imageURL} />
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
              {post.user.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{post.user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <p className="text-sm mt-2 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>

            {post.imageURL && (
              <div className="mt-3 rounded-lg overflow-hidden border border-border">
                <Image
                  src={post.imageURL}
                  alt="Post image"
                  width={600}
                  height={400}
                  className="w-full object-cover max-h-96"
                />
              </div>
            )}

            {post.type === "poll" && post.pollOptions.length > 0 && (
              <PollDisplay options={post.pollOptions} postId={post.id} />
            )}

            <div className="flex items-center gap-4 mt-3">
              <button
                onClick={() => {
                  if (!isSignedIn) {
                    toast.error("Sign in to like posts");
                    return;
                  }
                  toggleLike.mutate({ postId: post.id });
                }}
                disabled={toggleLike.isPending}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  hasLiked
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <ThumbsUp className={`h-4 w-4 ${hasLiked ? "fill-primary" : ""}`} />
                {post.likeCount > 0 ? formatCount(post.likeCount) : "Like"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The post{post.type === "poll" ? " and all its poll votes" : ""} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePost.mutate({ id: post.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePost.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function CommunityPage() {
  const { isSignedIn } = useAuth();

  const { data: posts, isLoading } = trpc.community.getAll.useQuery(
    { limit: 30 }
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold tracking-tight mb-6">
        <span className="gradient-text">Community</span>
      </h1>

      {isSignedIn && <CreatePostForm />}

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-10 w-10 text-primary/60" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No community posts yet</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              {isSignedIn
                ? "Be the first to create a post!"
                : "Sign in to create and interact with community posts."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
