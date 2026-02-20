"use client";

import { Crown, Sparkles, Zap, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SubscriptionTier } from "@/lib/premium";

interface PremiumBadgeProps {
  tier: SubscriptionTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const BADGE_CONFIG: Record<string, {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  tooltip: string;
}> = {
  lite: {
    icon: <Zap className="h-3 w-3" />,
    label: "Lite",
    bgColor: "bg-blue-600/20",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/30",
    tooltip: "NepTube Lite member",
  },
  premium: {
    icon: <Sparkles className="h-3 w-3" />,
    label: "Premium",
    bgColor: "bg-purple-600/20",
    textColor: "text-purple-400",
    borderColor: "border-purple-500/30",
    tooltip: "NepTube Premium member",
  },
  vip: {
    icon: <Crown className="h-3 w-3" />,
    label: "VIP",
    bgColor: "bg-yellow-600/20",
    textColor: "text-yellow-400",
    borderColor: "border-yellow-500/30",
    tooltip: "NepTube VIP member",
  },
};

const SIZE_CLASSES = {
  sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
  md: "text-xs px-2 py-0.5 gap-1",
  lg: "text-sm px-2.5 py-1 gap-1.5",
};

/**
 * Displays a premium badge next to user names based on their subscription tier.
 * Free tier users get no badge.
 */
export function PremiumBadge({ tier, size = "sm", showLabel = true }: PremiumBadgeProps) {
  if (tier === "free") return null;

  const config = BADGE_CONFIG[tier];
  if (!config) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={`inline-flex items-center ${SIZE_CLASSES[size]} ${config.bgColor} ${config.textColor} border ${config.borderColor} font-medium cursor-default`}
          >
            {config.icon}
            {showLabel && <span>{config.label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="bg-neutral-800 text-white border-neutral-700">
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Premium content lock overlay for videos that require a subscription.
 */
export function PremiumContentLock({
  requiredTier,
  reason,
}: {
  requiredTier: "lite" | "premium" | "vip";
  reason?: string;
}) {
  const config = BADGE_CONFIG[requiredTier];

  return (
    <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
      <div className={`p-4 rounded-full ${config?.bgColor} mb-4`}>
        <Shield className={`h-8 w-8 ${config?.textColor}`} />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">
        {requiredTier === "vip" ? "VIP" : requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} Content
      </h3>
      <p className="text-sm text-gray-400 mb-4 max-w-sm">
        {reason || `This content is exclusively available for ${requiredTier} members and above.`}
      </p>
      <a
        href="/premium"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${
          requiredTier === "vip"
            ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-black"
            : requiredTier === "premium"
            ? "bg-purple-600 text-white"
            : "bg-blue-600 text-white"
        }`}
      >
        {config?.icon}
        Upgrade to {requiredTier === "vip" ? "VIP" : requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
      </a>
    </div>
  );
}
