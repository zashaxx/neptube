"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/trpc/client";
import { X, Volume2, VolumeX, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdOverlayProps {
  onAdComplete: () => void;
  position?: "pre-roll" | "mid-roll" | "banner";
}

/**
 * Ad overlay component that respects user's subscription tier:
 * - Free: Full ads with 5s skip timer
 * - Lite: Reduced frequency (only pre-roll, shorter timer)
 * - Premium/VIP: No ads at all
 */
export function AdOverlay({ onAdComplete, position = "pre-roll" }: AdOverlayProps) {
  const { data: subscription } = trpc.premium.getMySubscription.useQuery();
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [muted, setMuted] = useState(false);

  const adConfig = subscription?.adConfig;

  useEffect(() => {
    // If no ads should show, complete immediately
    if (adConfig && !adConfig.showAds) {
      onAdComplete();
      return;
    }

    // Lite users: only show pre-roll ads, skip mid-roll and banner
    if (adConfig?.reducedFrequency && position !== "pre-roll") {
      onAdComplete();
      return;
    }

    // Countdown for skip button
    const skipTime = adConfig?.reducedFrequency ? 3 : 5; // Lite gets shorter wait
    setCountdown(skipTime);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanSkip(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [adConfig, position, onAdComplete]);

  // Don't render if ad-free
  if (adConfig && !adConfig.showAds) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      {/* Simulated Ad Content */}
      <div className="relative w-full max-w-lg bg-neutral-800 rounded-lg overflow-hidden">
        <div className="aspect-video bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-xs uppercase tracking-wider opacity-70">Advertisement</p>
            <p className="text-2xl font-bold mt-2">Ad Placeholder</p>
            <p className="text-sm opacity-80 mt-1">
              Upgrade to Premium for ad-free viewing
            </p>
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex items-center justify-between p-2 bg-neutral-900">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              onClick={() => setMuted(!muted)}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <span className="text-xs text-gray-500">Ad · {position}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-gray-400 hover:text-white"
              onClick={() => window.open("/premium", "_blank")}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Go Ad-Free
            </Button>

            {canSkip ? (
              <Button
                size="sm"
                className="bg-white text-black hover:bg-gray-200 text-xs h-7"
                onClick={onAdComplete}
              >
                Skip Ad <X className="h-3 w-3 ml-1" />
              </Button>
            ) : (
              <span className="text-xs text-gray-400 px-2">
                Skip in {countdown}s
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Banner ad that shows between feed items for free users.
 * Lite: smaller/less frequent. Premium/VIP: hidden.
 */
export function FeedBannerAd() {
  const { data: subscription } = trpc.premium.getMySubscription.useQuery();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const adConfig = subscription?.adConfig;
  if (adConfig && !adConfig.showAds) return null;

  return (
    <div className="relative my-4 mx-2 bg-gradient-to-r from-neutral-800 to-neutral-700 border border-neutral-600 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">AD</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Sponsored</p>
            <p className="text-sm text-white font-medium">Upgrade to NepTube Premium</p>
            <p className="text-xs text-gray-400">Ad-free streaming starts at NPR 200/month</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
            onClick={() => window.open("/premium", "_self")}
          >
            Learn More
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-gray-500 hover:text-white"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
