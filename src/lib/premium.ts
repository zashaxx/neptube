// Premium subscription tier configuration and helper utilities

export type SubscriptionTier = "free" | "lite" | "premium" | "vip";

export interface TierConfig {
  name: string;
  price: number; // NPR per month
  priceInPaisa: number;
  features: string[];
  maxQuality: string;
  maxDownloadsPerMonth: number; // -1 = unlimited
  adFree: boolean;
  reducedAds: boolean;
  exclusiveContent: boolean;
  earlyAccess: boolean;
  superChat: boolean;
  prioritySupport: boolean;
  analyticsDashboard: boolean;
  unlimitedPlaylists: boolean;
  encryptedDownloads: boolean;
  tipping: boolean;
}

export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
  free: {
    name: "Free",
    price: 0,
    priceInPaisa: 0,
    features: [
      "Basic video streaming (480p)",
      "Limited playlists (up to 3)",
      "Standard recommendation",
      "Community posts access",
    ],
    maxQuality: "480p",
    maxDownloadsPerMonth: 0,
    adFree: false,
    reducedAds: false,
    exclusiveContent: false,
    earlyAccess: false,
    superChat: false,
    prioritySupport: false,
    analyticsDashboard: false,
    unlimitedPlaylists: false,
    encryptedDownloads: false,
    tipping: false,
  },
  lite: {
    name: "Lite",
    price: 200,
    priceInPaisa: 20000,
    features: [
      "Reduced ad frequency",
      "720p video quality",
      "5 offline downloads/month",
      "Basic playlist saving",
      "Standard recommendation",
    ],
    maxQuality: "720p",
    maxDownloadsPerMonth: 5,
    adFree: false,
    reducedAds: true,
    exclusiveContent: false,
    earlyAccess: false,
    superChat: false,
    prioritySupport: false,
    analyticsDashboard: false,
    unlimitedPlaylists: false,
    encryptedDownloads: false,
    tipping: false,
  },
  premium: {
    name: "Premium",
    price: 500,
    priceInPaisa: 50000,
    features: [
      "Completely ad-free",
      "Full HD (1080p) streaming",
      "Unlimited offline downloads",
      "Unlimited playlists",
      "Exclusive content access",
      "Early access to new videos",
      "Advanced recommendations",
      "Premium badge",
    ],
    maxQuality: "1080p",
    maxDownloadsPerMonth: -1,
    adFree: true,
    reducedAds: true,
    exclusiveContent: true,
    earlyAccess: true,
    superChat: false,
    prioritySupport: false,
    analyticsDashboard: false,
    unlimitedPlaylists: true,
    encryptedDownloads: false,
    tipping: false,
  },
  vip: {
    name: "VIP",
    price: 1000,
    priceInPaisa: 100000,
    features: [
      "All Premium features",
      "4K video streaming",
      "Unlimited encrypted downloads",
      "Super Chat in live streams",
      "Priority support",
      "Analytics dashboard",
      "Creator tipping",
      "Exclusive live events",
      "Advanced personalization",
      "VIP badge",
    ],
    maxQuality: "4k",
    maxDownloadsPerMonth: -1,
    adFree: true,
    reducedAds: true,
    exclusiveContent: true,
    earlyAccess: true,
    superChat: true,
    prioritySupport: true,
    analyticsDashboard: true,
    unlimitedPlaylists: true,
    encryptedDownloads: true,
    tipping: true,
  },
};

// Tier hierarchy for comparing access levels
const TIER_LEVELS: Record<SubscriptionTier, number> = {
  free: 0,
  lite: 1,
  premium: 2,
  vip: 3,
};

/**
 * Check if user tier has at least the required tier level
 */
export function hasMinTier(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  return TIER_LEVELS[userTier] >= TIER_LEVELS[requiredTier];
}

/**
 * Get the max allowed video quality for a tier
 */
export function getMaxQuality(tier: SubscriptionTier): string {
  return TIER_CONFIG[tier].maxQuality;
}

/**
 * Check if a user can access a specific video quality
 */
export function canAccessQuality(tier: SubscriptionTier, quality: string): boolean {
  const qualityLevels: Record<string, number> = {
    "360p": 0,
    "480p": 1,
    "720p": 2,
    "1080p": 3,
    "4k": 4,
  };
  const tierMaxLevel = qualityLevels[TIER_CONFIG[tier].maxQuality] ?? 1;
  const requestedLevel = qualityLevels[quality] ?? 1;
  return requestedLevel <= tierMaxLevel;
}

/**
 * Check if a user can download videos and how many remain
 */
export function getDownloadQuota(tier: SubscriptionTier): { allowed: boolean; maxPerMonth: number } {
  const config = TIER_CONFIG[tier];
  return {
    allowed: config.maxDownloadsPerMonth !== 0,
    maxPerMonth: config.maxDownloadsPerMonth,
  };
}

/**
 * Check if user should see ads
 */
export function shouldShowAds(tier: SubscriptionTier): { showAds: boolean; reducedFrequency: boolean } {
  const config = TIER_CONFIG[tier];
  if (config.adFree) return { showAds: false, reducedFrequency: false };
  if (config.reducedAds) return { showAds: true, reducedFrequency: true };
  return { showAds: true, reducedFrequency: false };
}

/**
 * Check if user can access exclusive/early-access content
 */
export function canAccessContent(
  tier: SubscriptionTier,
  video: { isPremiumOnly?: boolean | null; isVipOnly?: boolean | null; earlyAccessUntil?: Date | null }
): { allowed: boolean; reason?: string } {
  if (video.isVipOnly && !hasMinTier(tier, "vip")) {
    return { allowed: false, reason: "This content is exclusively for VIP members." };
  }
  if (video.isPremiumOnly && !hasMinTier(tier, "premium")) {
    return { allowed: false, reason: "This content requires a Premium or VIP subscription." };
  }
  if (video.earlyAccessUntil && new Date() < video.earlyAccessUntil && !hasMinTier(tier, "vip")) {
    return { allowed: false, reason: "Early access is available for VIP members only." };
  }
  return { allowed: true };
}

/**
 * Format price in NPR
 */
export function formatNPR(amountInPaisa: number): string {
  return `NPR ${(amountInPaisa / 100).toLocaleString("en-NP")}`;
}

/**
 * Check if a subscription has expired
 */
export function isSubscriptionExpired(expiryDate: Date | null): boolean {
  if (!expiryDate) return true;
  return new Date() > expiryDate;
}
