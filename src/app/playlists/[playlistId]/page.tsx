"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { ListVideo, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
  return `${count} views`;
}

export default function PlaylistDetailPage() {
  const params = useParams();
  const playlistId = params.playlistId as string;
  const utils = trpc.useUtils();

  const { data: playlist, isLoading } = trpc.playlists.getById.useQuery(
    { id: playlistId },
    { enabled: !!playlistId }
  );

  const removeVideo = trpc.playlists.removeVideo.useMutation({
    onSuccess: () => {
      utils.playlists.getById.invalidate({ id: playlistId });
      utils.playlists.getMyPlaylists.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-32 mb-6" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-44 aspect-video rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-xl font-semibold mb-2">Playlist not found</h1>
        <Link href="/playlists">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Playlists
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link
        href="/playlists"
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Playlists
      </Link>

      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ListVideo className="h-6 w-6 text-primary" />
          {playlist.name}
        </h1>
        {playlist.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {playlist.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {playlist.videos.length} videos · {playlist.visibility}
        </p>
      </div>

      {playlist.videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
          <p className="text-muted-foreground text-sm">
            No videos in this playlist yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {playlist.videos.map((item, index) => (
            <div
              key={item.id}
              className="group flex gap-4 p-3 rounded-xl border border-border bg-card"
            >
              <div className="flex items-center justify-center w-6 text-sm text-muted-foreground flex-shrink-0">
                {index + 1}
              </div>

              <Link
                href={`/feed/${item.video.id}`}
                className="relative w-36 aspect-video bg-muted rounded-lg overflow-hidden flex-shrink-0"
              >
                {item.video.thumbnailURL ? (
                  <Image
                    src={item.video.thumbnailURL}
                    alt={item.video.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <span className="text-primary font-bold">
                      {item.video.title[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/feed/${item.video.id}`}
                  className="font-medium text-sm line-clamp-2 hover:text-primary transition-colors"
                >
                  {item.video.title}
                </Link>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.user.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatViewCount(item.video.viewCount)}
                </p>
              </div>

              <button
                onClick={() =>
                  removeVideo.mutate({
                    playlistId,
                    videoId: item.video.id,
                  })
                }
                className="opacity-0 group-hover:opacity-100 transition-opacity self-center p-1.5 rounded-md hover:bg-destructive/10"
                title="Remove from playlist"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
