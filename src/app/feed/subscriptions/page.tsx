"use client";

import { Suspense } from "react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { PlaySquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
  return `${count} views`;
}

function SubscriptionsFeed() {
  const { data, isLoading } = trpc.videos.getSubscriptionsFeed.useQuery({
    limit: 20,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <Skeleton className="aspect-video" />
              <div className="p-3.5">
                <div className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <PlaySquare className="h-10 w-10 text-primary/60" />
        </div>
        <h2 className="text-lg font-semibold mb-1">No subscription videos</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          {data?.subscribedChannels === 0
            ? "Subscribe to channels to see their latest videos here."
            : "Channels you follow haven't uploaded recently."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight gradient-text">Subscriptions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Latest from your {data.subscribedChannels} subscribed channels
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
        {data.items.map((video) => (
          <Link key={video.id} href={`/feed/${video.id}`} className="group">
            <div className="glass-card gradient-border rounded-xl overflow-hidden">
              <div className="relative aspect-video bg-muted overflow-hidden thumbnail-hover">
                {video.isNsfw && (
                  <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-xl flex items-center justify-center">
                    <span className="text-red-400 text-xs font-medium">NSFW</span>
                  </div>
                )}
                {video.thumbnailURL ? (
                  <Image
                    src={video.thumbnailURL}
                    alt={video.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <span className="text-primary text-3xl font-bold">
                      {video.title[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3.5">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted">
                      {video.user.imageURL ? (
                        <Image
                          src={video.user.imageURL}
                          alt={video.user.name}
                          width={32}
                          height={32}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-semibold">
                          {video.user.name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {video.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatViewCount(video.viewCount)} ·{" "}
                      {formatDistanceToNow(new Date(video.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <Skeleton className="h-8 w-48 mb-6" />
        </div>
      }
    >
      <SubscriptionsFeed />
    </Suspense>
  );
}
