"use client";

import { trpc } from "@/trpc/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock } from "lucide-react";
import Link from "next/link";

interface VideoQualitySelectorProps {
  currentQuality: string;
  onQualityChange: (quality: string) => void;
  availableQualities?: string[];
}

const QUALITY_ORDER = ["360p", "480p", "720p", "1080p", "4k"];

const QUALITY_LABELS: Record<string, string> = {
  "360p": "360p",
  "480p": "480p (SD)",
  "720p": "720p (HD)",
  "1080p": "1080p (Full HD)",
  "4k": "4K (Ultra HD)",
};

/**
 * Video quality selector that gates higher qualities based on subscription tier.
 * Free: up to 480p
 * Lite: up to 720p
 * Premium: up to 1080p
 * VIP: up to 4K
 */
export function VideoQualitySelector({
  currentQuality,
  onQualityChange,
  availableQualities = QUALITY_ORDER,
}: VideoQualitySelectorProps) {
  const { data: subscription } = trpc.premium.getMySubscription.useQuery();

  const maxQuality = subscription?.tierConfig.maxQuality || "480p";
  const maxQualityIndex = QUALITY_ORDER.indexOf(maxQuality);

  return (
    <Select value={currentQuality} onValueChange={onQualityChange}>
      <SelectTrigger className="w-32 bg-neutral-800 border-neutral-700 text-white text-xs h-8">
        <SelectValue placeholder="Quality" />
      </SelectTrigger>
      <SelectContent className="bg-neutral-800 border-neutral-700">
        {availableQualities.map((quality) => {
          const qualityIndex = QUALITY_ORDER.indexOf(quality);
          const isLocked = qualityIndex > maxQualityIndex;

          return (
            <SelectItem
              key={quality}
              value={quality}
              disabled={isLocked}
              className={`text-xs ${
                isLocked
                  ? "text-gray-500 cursor-not-allowed"
                  : "text-white hover:bg-neutral-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{QUALITY_LABELS[quality] || quality}</span>
                {isLocked && (
                  <Lock className="h-3 w-3 text-yellow-500" />
                )}
              </div>
            </SelectItem>
          );
        })}

        {maxQualityIndex < QUALITY_ORDER.length - 1 && (
          <div className="px-2 py-1 border-t border-neutral-700 mt-1">
            <Link
              href="/premium"
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              Upgrade for higher quality →
            </Link>
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
