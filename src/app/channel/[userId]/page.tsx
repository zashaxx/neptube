"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  Eye,
  PlayCircle,
  Edit3,
  Save,
  X,
  ImageIcon,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@clerk/nextjs";

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// ─── Channel Edit Dialog ────────────────────────────────────────────────

function ChannelEditDialog({
  currentName,
  currentDescription,
  currentBannerURL,
  onSaved,
}: {
  currentName: string;
  currentDescription: string | null;
  currentBannerURL: string | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription ?? "");
  const [bannerURL, setBannerURL] = useState(currentBannerURL ?? "");
  const [open, setOpen] = useState(false);

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      setOpen(false);
      onSaved();
    },
  });

  const handleSave = () => {
    updateProfile.mutate({
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      bannerURL: bannerURL.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-lg">
          <Edit3 className="h-4 w-4" />
          Customize Channel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customize your channel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Channel name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Edit3 className="h-3.5 w-3.5" />
              Channel Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your channel name"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              About
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers about your channel..."
              className="min-h-[100px] resize-none"
              maxLength={1000}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {description.length}/1000
            </p>
          </div>

          {/* Banner URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              Banner Image URL
            </label>
            <Input
              value={bannerURL}
              onChange={(e) => setBannerURL(e.target.value)}
              placeholder="https://example.com/banner.jpg"
              type="url"
            />
            {bannerURL && (
              <div className="relative w-full h-24 rounded-lg overflow-hidden bg-muted">
                <Image
                  src={bannerURL}
                  alt="Banner preview"
                  fill
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending || !name.trim()}
              className="gap-1.5"
            >
              {updateProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Channel Page ───────────────────────────────────────────────────────

export default function ChannelPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { isSignedIn } = useAuth();

  const { data: channel, isLoading } = trpc.videos.getChannelProfile.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const { data: currentUser } = trpc.users.me.useQuery(undefined, {
    enabled: !!isSignedIn,
  });

  const isOwnChannel = currentUser?.id === userId;

  const { data: subCount } = trpc.subscriptions.getCount.useQuery(
    { channelId: userId },
    { enabled: !!userId }
  );

  const { data: isSubscribed } = trpc.subscriptions.isSubscribed.useQuery(
    { channelId: userId },
    { enabled: !!userId && !!isSignedIn && !isOwnChannel }
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

            <div className="flex items-center gap-2">
              {/* Own channel — edit button */}
              {isOwnChannel && (
                <ChannelEditDialog
                  currentName={channel.name}
                  currentDescription={channel.description}
                  currentBannerURL={channel.bannerURL}
                  onSaved={() => {
                    utils.videos.getChannelProfile.invalidate({ userId });
                    utils.users.me.invalidate();
                  }}
                />
              )}

              {/* Subscribe button (not on own channel) */}
              {isSignedIn && !isOwnChannel && (
                <Button
                  onClick={() => toggleSub.mutate({ channelId: userId })}
                  disabled={toggleSub.isPending}
                  variant={isSubscribed ? "outline" : "default"}
                  className={`rounded-lg ${!isSubscribed ? "gradient-btn" : ""}`}
                >
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </Button>
              )}
            </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
            {channel.videos.map((video, i) => (
              <Link
                key={video.id}
                href={`/feed/${video.id}`}
                className="group card-animate"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden mb-2">
                  {video.thumbnailURL ? (
                    <Image
                      src={video.thumbnailURL}
                      alt={video.title}
                      fill
                      className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <span className="text-muted-foreground font-bold text-lg">
                        {video.title[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="text-[13px] font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                  {video.title}
                </h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-0.5">
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
