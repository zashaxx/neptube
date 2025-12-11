"use client";

import { Suspense } from "react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Eye, Upload, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
  user: {
    id: string;
    name: string;
    imageURL: string;
  };
}}) {
  return (
    <Link href={`/feed/${video.id}`} className="group cursor-pointer">
      <div className="flex flex-col">
        {/* Thumbnail - YouTube style with rounded corners */}
        <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mb-3">
          {video.thumbnailURL ? (
            <Image
              src={video.thumbnailURL}
              alt={video.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
              <span className="text-white text-3xl sm:text-4xl font-bold">
                {video.title[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        {/* Video Info - YouTube layout */}
        <div className="flex gap-3">
          {/* Channel Avatar */}
          <div className="flex-shrink-0 pt-0.5">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              {video.user.imageURL ? (
                <Image
                  src={video.user.imageURL}
                  alt={video.user.name}
                  width={36}
                  height={36}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white font-semibold text-sm">
                  {video.user.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
          
          {/* Title and Channel Info */}
          <div className="flex-1 min-w-0">
            {/* Video Title */}
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-gray-900 dark:text-white mb-1">
              {video.title}
            </h3>
            
            {/* Channel Name */}
            <div className="flex items-center">
              <p className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                {video.user.name}
              </p>
            </div>
            
            {/* Views and Date */}
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <span>{formatViewCount(video.viewCount)}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function VideoCardSkeleton() {
  return (
    <div className="flex flex-col">
      {/* Thumbnail Skeleton */}
      <Skeleton className="aspect-video rounded-xl mb-3" />
      
      {/* Info Skeleton */}
      <div className="flex gap-3">
        {/* Avatar Skeleton */}
        <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
        
        {/* Text Content Skeleton */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

function FeedPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";

  const { data, isLoading, error } = trpc.videos.getFeed.useQuery({
    limit: 20,
    search: searchQuery || undefined,
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 mb-2">Error loading videos</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 dark:bg-gray-950 bg-white min-h-screen w-full">
      <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg sm:text-xl font-semibold dark:text-white">
            {searchQuery ? `Search results for "${searchQuery}"` : ""}
          </h1>
        </div>

        {/* Video Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10">
            {[...Array(9)].map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            {searchQuery ? (
              <Search className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            ) : (
              <Eye className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <h2 className="text-xl font-semibold mb-2 dark:text-white">
            {searchQuery ? "No videos found" : "No videos yet"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery
              ? `No videos match "${searchQuery}". Try a different search.`
              : "Be the first to upload a video!"}
          </p>
          {!searchQuery && (
            <Link href="/studio/upload">
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10">
          {data?.items.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function FeedPageLoading() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function FeedPageWrapper() {
  return (
    <Suspense fallback={<FeedPageLoading />}>
      <FeedPage />
    </Suspense>
  );
}