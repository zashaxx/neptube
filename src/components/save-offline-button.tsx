"use client";

import { useState, useEffect, useCallback } from "react";
import {
  HardDriveDownload, Trash2, Loader2, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  saveVideoOffline,
  isVideoOffline,
  deleteOfflineVideo,
} from "@/lib/offline-video";

interface SaveOfflineButtonProps {
  videoId: string;
  videoUrl: string;
  title: string;
  thumbnailURL: string | null;
}

/**
 * Button that saves a video to IndexedDB for offline/local playback.
 * Shows download progress and allows removal of offline copies.
 */
export function SaveOfflineButton({
  videoId,
  videoUrl,
  title,
  thumbnailURL,
}: SaveOfflineButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [checking, setChecking] = useState(true);

  // Check if already saved offline
  useEffect(() => {
    isVideoOffline(videoId)
      .then(setIsSaved)
      .finally(() => setChecking(false));
  }, [videoId]);

  const handleSaveOffline = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setProgress(0);

    try {
      await saveVideoOffline(
        videoId,
        title,
        videoUrl,
        thumbnailURL,
        (loaded, total) => {
          setProgress(Math.round((loaded / total) * 100));
        }
      );
      setIsSaved(true);
      toast.success("Video saved for offline playback!", {
        description: "This video will now load instantly from your device.",
      });
    } catch (err) {
      console.error("Failed to save offline:", err);
      toast.error("Failed to save video offline", {
        description: "Storage may be full or the download failed.",
      });
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  }, [videoId, videoUrl, title, thumbnailURL, isDownloading]);

  const handleRemoveOffline = useCallback(async () => {
    try {
      await deleteOfflineVideo(videoId);
      setIsSaved(false);
      toast("Offline copy removed.");
    } catch (err) {
      console.error("Failed to remove offline video:", err);
      toast.error("Failed to remove offline copy.");
    }
  }, [videoId]);

  if (checking) {
    return (
      <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="hidden sm:inline">Checking...</span>
      </Button>
    );
  }

  if (isSaved) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 rounded-lg text-emerald-500 hover:text-red-500 group"
        onClick={handleRemoveOffline}
        title="Remove offline copy"
      >
        <CheckCircle className="h-4 w-4 group-hover:hidden" />
        <Trash2 className="h-4 w-4 hidden group-hover:block" />
        <span className="hidden sm:inline group-hover:hidden">Saved Offline</span>
        <span className="hidden group-hover:inline">Remove</span>
      </Button>
    );
  }

  if (isDownloading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 rounded-lg text-sky-500"
        disabled
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="hidden sm:inline">{progress}%</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 rounded-lg"
      onClick={handleSaveOffline}
      title="Save for offline playback — loads instantly next time"
    >
      <HardDriveDownload className="h-4 w-4" />
      <span className="hidden sm:inline">Save Offline</span>
    </Button>
  );
}
