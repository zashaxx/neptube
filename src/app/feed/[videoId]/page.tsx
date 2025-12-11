"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp, ThumbsDown, Share2, Flag, Eye, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export default function VideoPage() {
  const params = useParams();
  const videoId = params.videoId as string;
  const { isSignedIn } = useAuth();

  const { data: video, isLoading, error } = trpc.videos.getById.useQuery(
    { id: videoId },
    { enabled: !!videoId }
  );

  const incrementViews = trpc.videos.incrementViews.useMutation();
  const addToWatchHistory = trpc.videos.addToWatchHistory.useMutation();
  const toggleLikeMutation = trpc.videos.toggleLike.useMutation();
  const { data: likeStatus, refetch: refetchLikeStatus } = trpc.videos.getLikeStatus.useQuery(
    { videoId },
    { enabled: !!videoId && isSignedIn }
  );

  const [localLikeStatus, setLocalLikeStatus] = useState<{ isLike: boolean } | null>(null);

  // Update local like status when data changes
  useEffect(() => {
    if (likeStatus) {
      setLocalLikeStatus(likeStatus);
    }
  }, [likeStatus]);

  // Increment view count and add to watch history when video loads
  useEffect(() => {
    if (videoId) {
      incrementViews.mutate({ id: videoId });
      
      if (isSignedIn) {
        addToWatchHistory.mutate({ videoId });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, isSignedIn]);

  const handleLike = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to like videos");
      return;
    }

    const previousStatus = localLikeStatus;
    
    // Optimistic update
    if (localLikeStatus?.isLike === true) {
      setLocalLikeStatus(null);
    } else {
      setLocalLikeStatus({ isLike: true });
    }

    try {
      await toggleLikeMutation.mutateAsync({
        videoId,
        isLike: true,
      });
      await refetchLikeStatus();
    } catch {
      // Revert on error
      setLocalLikeStatus(previousStatus);
      toast.error("Failed to like video");
    }
  };

  const handleDislike = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to dislike videos");
      return;
    }

    const previousStatus = localLikeStatus;
    
    // Optimistic update
    if (localLikeStatus?.isLike === false) {
      setLocalLikeStatus(null);
    } else {
      setLocalLikeStatus({ isLike: false });
    }

    try {
      await toggleLikeMutation.mutateAsync({
        videoId,
        isLike: false,
      });
      await refetchLikeStatus();
    } catch {
      // Revert on error
      setLocalLikeStatus(previousStatus);
      toast.error("Failed to dislike video");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 dark:bg-gray-950 min-h-screen">
        <Skeleton className="aspect-video w-full rounded-xl mb-4" />
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] dark:bg-gray-950">
        <h1 className="text-2xl font-bold mb-2 dark:text-white">Video not found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          This video may have been removed or doesn&apos;t exist.
        </p>
        <Link href="/feed">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Feed
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 dark:bg-gray-950 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player */}
          <div className="aspect-video bg-black rounded-xl overflow-hidden">
            {video.videoURL ? (
              <video
                src={video.videoURL}
                controls
                autoPlay
                className="w-full h-full"
                poster={video.thumbnailURL || undefined}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <p>Video not available</p>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold dark:text-white">{video.title}</h1>

          {/* Stats and Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b dark:border-gray-800">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Eye className="h-4 w-4" />
              <span>{formatViewCount(video.viewCount)} views</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-l-full gap-1 ${
                    localLikeStatus?.isLike === true 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : ''
                  }`}
                  onClick={handleLike}
                  disabled={toggleLikeMutation.isPending}
                >
                  <ThumbsUp className={`h-4 w-4 ${
                    localLikeStatus?.isLike === true ? 'fill-current' : ''
                  }`} />
                  {formatViewCount(video.likeCount)}
                </Button>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-r-full gap-1 ${
                    localLikeStatus?.isLike === false 
                      ? 'text-red-600 dark:text-red-400' 
                      : ''
                  }`}
                  onClick={handleDislike}
                  disabled={toggleLikeMutation.isPending}
                >
                  <ThumbsDown className={`h-4 w-4 ${
                    localLikeStatus?.isLike === false ? 'fill-current' : ''
                  }`} />
                  {formatViewCount(video.dislikeCount)}
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 dark:text-gray-300">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="ghost" size="sm" className="gap-1 dark:text-gray-300">
                <Flag className="h-4 w-4" />
                Report
              </Button>
            </div>
          </div>

          {/* Channel Info */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <Avatar className="h-12 w-12">
              <AvatarImage src={video.user.imageURL} />
              <AvatarFallback>{video.user.name[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <Link href={`/channel/${video.user.id}`} className="font-semibold hover:underline dark:text-white">
                    {video.user.name}
                  </Link>
                </div>
                <Button className="bg-red-600 hover:bg-red-700">Subscribe</Button>
              </div>
              {video.description && (
                <div className="mt-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {video.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section Placeholder */}
          <div className="border-t dark:border-gray-800 pt-4">
            <h2 className="font-semibold mb-4 dark:text-white">Comments</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Comments coming soon...
            </p>
          </div>
        </div>

        {/* Sidebar - Related Videos */}
        <div className="space-y-4">
          <h2 className="font-semibold dark:text-white">Related Videos</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            More videos coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}