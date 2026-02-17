"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Users, Eye, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@clerk/nextjs";

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function ChannelPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { isSignedIn } = useAuth();

  const { data: channel, isLoading } = trpc.videos.getChannelProfile.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const { data: subCount } = trpc.subscriptions.getCount.useQuery(
    { channelId: userId },
    { enabled: !!userId }
  );

  const { data: isSubscribed } = trpc.subscriptions.isSubscribed.useQuery(
    { channelId: userId },
    { enabled: !!userId && !!isSignedIn }
  );

  const utils = trpc.useUtils();
  const toggleSub = trpc.subscriptions.toggle.useMutation({
    onSuccess: () => {
      utils.subscriptions.isSubscribed.invalidate({ channelId: userId });
      utils.subscriptions.getCount.invalidate({ channelId: userId });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Skeleton className="w-full h-40 rounded-none" />
        <div className="p-6 flex gap-5 items-end -mt-8">
          <Skeleton className="h-24 w-24 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-xl font-semibold mb-2">Channel not found</h1>
        <Link href="/feed">
          <Button variant="outline">Back to Feed</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Banner */}
      <div className="relative w-full h-44 overflow-hidden">
        {channel.bannerURL ? (
          <Image
            src={channel.bannerURL}
            alt="Banner"
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(262,83%,58%)] via-[hsl(280,70%,55%)] to-[hsl(190,80%,50%)] opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Channel Info */}
      <div className="px-6 pb-6">
        <div className="flex items-end gap-5 -mt-12">
          <Avatar className="h-24 w-24 rounded-xl border-4 border-background shadow-lg ring-2 ring-primary/20">
            <AvatarImage src={channel.imageURL} />
            <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-2xl">
              {channel.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 flex items-end justify-between pb-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight gradient-text">
                {channel.name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {formatViewCount(Number(subCount ?? 0))} subscribers
                </span>
                <span>·</span>
                <span>{channel.videos.length} videos</span>
              </div>
            </div>

            {isSignedIn && (
              <Button
                onClick={() => toggleSub.mutate({ channelId: userId })}
                disabled={toggleSub.isPending}
                variant={isSubscribed ? "outline" : "default"}
                className={`rounded-lg ${!isSubscribed ? 'gradient-btn' : ''}`}
              >
                {isSubscribed ? "Subscribed" : "Subscribe"}
              </Button>
            )}
          </div>
        </div>

        {channel.description && (
          <p className="mt-4 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {channel.description}
          </p>
        )}
      </div>

      {/* Videos Grid */}
      <div className="px-6 pb-8">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-primary" />
          Videos
        </h2>
        {channel.videos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            This channel has no videos yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {channel.videos.map((video, i) => (
              <Link key={video.id} href={`/feed/${video.id}`} className="group card-animate" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="glass-card gradient-border rounded-xl overflow-hidden">
                  <div className="relative aspect-video bg-muted overflow-hidden thumbnail-hover">
                    {video.thumbnailURL ? (
                      <Image
                        src={video.thumbnailURL}
                        alt={video.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <span className="text-primary font-bold text-xl">
                          {video.title[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatViewCount(video.viewCount)} views
                      </span>
                      <span>·</span>
                      <span>
                        {formatDistanceToNow(new Date(video.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
