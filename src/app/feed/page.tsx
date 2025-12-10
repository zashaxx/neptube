"use client";

import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Eye, Upload } from "lucide-react";
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
  createdAt: Date;
  user: {
    id: string;
    name: string;
    imageURL: string;
  };
}}) {
  return (
    <Link href={`/feed/${video.id}`} className="group">
      <div className="space-y-2">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden">
          {video.thumbnailURL ? (
            <Image
              src={video.thumbnailURL}
              alt={video.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
              <span className="text-white text-4xl font-bold">
                {video.title[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex gap-3">
          {/* Channel avatar */}
          <div className="flex-shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200">
              {video.user.imageURL ? (
                <Image
                  src={video.user.imageURL}
                  alt={video.user.name}
                  width={36}
                  height={36}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white">
                  {video.user.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
          
          {/* Title and meta */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
              {video.title}
            </h3>
            <p className="text-xs text-gray-600 mt-1">{video.user.name}</p>
            <p className="text-xs text-gray-500">
              {formatViewCount(video.viewCount)} • {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function VideoCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-video rounded-xl" />
      <div className="flex gap-3">
        <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

function FeedPage() {
  const { data, isLoading, error } = trpc.videos.getFeed.useQuery({
    limit: 20,
  });

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
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Recommended</h1>
        <Link href="/studio/upload">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </Link>
      </div>

      {/* Video Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Eye className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No videos yet</h2>
          <p className="text-gray-500 mb-4">
            Be the first to upload a video!
          </p>
          <Link href="/studio/upload">
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Video
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.items.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

export default FeedPage;