"use client";

import { trpc } from "@/trpc/client";
import type { SubscriptionTier } from "@/lib/premium";
import { TIER_CONFIG, hasMinTier, canAccessQuality, shouldShowAds, getDownloadQuota } from "@/lib/premium";

/**
 * Hook to access the current user's subscription status and tier-related utilities.
 * Provides helpers for checking feature access, quality limits, ad status, etc.
 */
export function useSubscription() {
  const { data, isLoading, error } = trpc.premium.getMySubscription.useQuery();

  const tier: SubscriptionTier = (data?.tier as SubscriptionTier) || "free";
  const config = TIER_CONFIG[tier];
  const adConfig = shouldShowAds(tier);
  const downloadQuota = getDownloadQuota(tier);

  return {
    // Raw data
    subscription: data?.subscription,
    tier,
    tierConfig: config,
    isLoading,
    error,

    // Status
    isActive: !data?.isExpired && tier !== "free",
    isExpired: data?.isExpired ?? true,
    isPremium: hasMinTier(tier, "premium"),
    isVip: hasMinTier(tier, "vip"),
    isLite: hasMinTier(tier, "lite"),
    isFree: tier === "free",

    // Feature checks
    adConfig,
    showAds: adConfig.showAds,
    maxQuality: config.maxQuality,
    canAccessQuality: (quality: string) => canAccessQuality(tier, quality),
    hasFeature: (feature: keyof typeof config) => !!config[feature],

    // Downloads
    downloadQuota,
    downloadsThisMonth: data?.downloadsThisMonth ?? 0,
    canDownload: downloadQuota.allowed,

    // Premium features
    canAccessExclusive: config.exclusiveContent,
    canAccessEarlyAccess: config.earlyAccess,
    canSuperChat: config.superChat,
    canTip: config.tipping,
    hasAnalytics: config.analyticsDashboard,
    hasPrioritySupport: config.prioritySupport,
    hasUnlimitedPlaylists: config.unlimitedPlaylists,
  };
}
