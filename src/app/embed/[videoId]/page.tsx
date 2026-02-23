"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import { getVideoSourceUrl } from "@/lib/offline-video";

export default function EmbedPage() {
  const params = useParams();
  const videoId = params.videoId as string;

  const { data: video, isLoading } = trpc.videos.getById.useQuery(
    { id: videoId },
    { enabled: !!videoId }
  );

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (!video || !video.videoURL) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center text-white text-sm">
        Video not available
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <video
        src={getVideoSourceUrl(videoId, video.videoURL)}
        controls
        autoPlay
        className="w-full h-full object-contain"
        poster={video.thumbnailURL || undefined}
      />
    </div>
  );
}
