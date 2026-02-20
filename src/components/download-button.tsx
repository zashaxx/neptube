"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Download, Lock, Loader2, CheckCircle } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";

interface DownloadButtonProps {
  videoId: string;
  videoTitle: string;
}

const QUALITY_OPTIONS = [
  { value: "360p", label: "360p (SD)", tier: "free" as const },
  { value: "480p", label: "480p (SD)", tier: "free" as const },
  { value: "720p", label: "720p (HD)", tier: "lite" as const },
  { value: "1080p", label: "1080p (Full HD)", tier: "premium" as const },
  { value: "4k", label: "4K (Ultra HD)", tier: "vip" as const },
];

/**
 * Download button for offline video downloads.
 * Respects subscription tier limits for quality and monthly quota.
 */
export function DownloadButton({ videoId, videoTitle }: DownloadButtonProps) {
  const { canDownload, canAccessQuality, downloadQuota, downloadsThisMonth } =
    useSubscription();
  const requestDownload = trpc.premium.requestDownload.useMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState("720p");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await requestDownload.mutateAsync({
        videoId,
        quality: selectedQuality as "360p" | "480p" | "720p" | "1080p" | "4k",
      });
      setDownloaded(true);
      setTimeout(() => {
        setDialogOpen(false);
        setDownloaded(false);
      }, 2000);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!canDownload) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="border-neutral-700 text-gray-500 cursor-not-allowed"
        disabled
        title="Upgrade to Lite or above for offline downloads"
      >
        <Lock className="h-4 w-4 mr-1" />
        Download
      </Button>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-neutral-700 text-gray-300 hover:bg-neutral-700"
        >
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-neutral-800 border-neutral-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Video
          </DialogTitle>
        </DialogHeader>

        {downloaded ? (
          <div className="flex flex-col items-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-white font-medium">Download Ready!</p>
            <p className="text-xs text-gray-400 mt-1">
              Available offline for 30 days
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-300 truncate">{videoTitle}</p>

            {/* Quota info */}
            {downloadQuota.maxPerMonth > 0 && (
              <div className="text-xs text-gray-400 bg-neutral-700/50 rounded p-2">
                Downloads this month: {downloadsThisMonth}/{downloadQuota.maxPerMonth}
              </div>
            )}

            {/* Quality Selection */}
            <RadioGroup
              value={selectedQuality}
              onValueChange={setSelectedQuality}
              className="space-y-2"
            >
              {QUALITY_OPTIONS.map((opt) => {
                const isAccessible = canAccessQuality(opt.value);
                return (
                  <div
                    key={opt.value}
                    className={`flex items-center gap-3 p-2 rounded border ${
                      isAccessible
                        ? selectedQuality === opt.value
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-neutral-700 hover:border-neutral-600"
                        : "border-neutral-700 opacity-50"
                    }`}
                  >
                    <RadioGroupItem
                      value={opt.value}
                      id={`dl-${opt.value}`}
                      disabled={!isAccessible}
                    />
                    <Label
                      htmlFor={`dl-${opt.value}`}
                      className={`flex-1 text-sm cursor-pointer ${
                        isAccessible ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {opt.label}
                    </Label>
                    {!isAccessible && (
                      <Lock className="h-3 w-3 text-yellow-500" />
                    )}
                  </div>
                );
              })}
            </RadioGroup>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-500 text-white"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download {selectedQuality}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
