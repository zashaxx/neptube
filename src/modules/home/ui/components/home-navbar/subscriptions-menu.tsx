"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Clapperboard, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function SubscriptionsMenu() {
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: subs } = trpc.subscriptions.getMySubscriptions.useQuery(
    undefined,
    { enabled: !!isSignedIn && open }
  );

  const { data: feed } = trpc.videos.getSubscriptionsFeed.useQuery(
    { limit: 8 },
    { enabled: !!isSignedIn && open }
  );

  if (!isSignedIn) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Subscriptions"
          className="rounded-lg h-9 w-9"
        >
          <Clapperboard className="h-[18px] w-[18px]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] p-0 bg-popover border-border shadow-xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Subscriptions</h3>
          <Link
            href="/feed/subscriptions"
            onClick={() => setOpen(false)}
            className="text-xs text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="w-full rounded-none border-b border-border bg-transparent h-9">
            <TabsTrigger value="videos" className="flex-1 text-xs gap-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
              Videos
            </TabsTrigger>
            <TabsTrigger value="channels" className="flex-1 text-xs gap-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
              Channels
            </TabsTrigger>
          </TabsList>

          {/* Videos Tab */}
          <TabsContent value="videos" className="mt-0">
            <div className="max-h-80 overflow-y-auto">
              {!feed || feed.items.length === 0 ? (
                <div className="py-8 text-center">
                  <Clapperboard className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No recent videos</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {feed.items.map((video) => (
                    <Link
                      key={video.id}
                      href={`/feed/${video.id}`}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-28 flex-shrink-0 aspect-video rounded-md overflow-hidden bg-muted">
                        {video.thumbnailURL ? (
                          <Image
                            src={video.thumbnailURL}
                            alt={video.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">
                            {video.title[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium line-clamp-2 leading-snug">
                          {video.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-1 truncate">
                          {video.user.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Eye className="h-3 w-3" />
                            {formatViewCount(video.viewCount)}
                          </span>
                          <span>·</span>
                          <span>
                            {formatDistanceToNow(new Date(video.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Channels Tab */}
          <TabsContent value="channels" className="mt-0">
            <div className="max-h-80 overflow-y-auto">
              {!subs || subs.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No subscriptions yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Subscribe to channels to see them here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {subs.map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/channel/${sub.channel.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={sub.channel.imageURL} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {sub.channel.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{sub.channel.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Subscribed {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
