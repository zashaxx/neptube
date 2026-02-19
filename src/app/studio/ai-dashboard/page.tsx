"use client";

import { trpc } from "@/trpc/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Brain,
  TrendingUp,
  Eye,
  ThumbsUp,
  MessageSquare,
  DollarSign,
  Sparkles,
  Video,
  BarChart3,
  Zap,
  Palette,
  Shield,
} from "lucide-react";

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

const moodColors: Record<string, string> = {
  uplifting: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  dark: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  humorous: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  informative: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  inspirational: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  chill: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  intense: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  nostalgic: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  suspenseful: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

const energyColors: Record<string, string> = {
  low: "text-blue-600",
  medium: "text-green-600",
  high: "text-orange-600",
  explosive: "text-red-600",
};

export default function AIDashboardPage() {
  const { data: insights, isLoading } = trpc.ai.getCreatorInsights.useQuery();

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" />
            AI Creator Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered insights across all your videos
          </p>
        </div>
        <Link href="/studio">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Studio
          </Button>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Video className="h-4 w-4" />
              Videos
            </div>
            <div className="text-2xl font-bold">{insights.videoCount}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Eye className="h-4 w-4" />
              Total Views
            </div>
            <div className="text-2xl font-bold">{formatCount(insights.totalViews)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <ThumbsUp className="h-4 w-4" />
              Total Likes
            </div>
            <div className="text-2xl font-bold">{formatCount(insights.totalLikes)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <MessageSquare className="h-4 w-4" />
              Comments
            </div>
            <div className="text-2xl font-bold">{formatCount(insights.totalComments)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Sparkles className="h-4 w-4" />
              Avg Quality
            </div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {insights.avgQualityScore ?? "N/A"}
              </div>
              {insights.avgQualityScore != null && (
                <span className="text-xs text-muted-foreground">/100</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Avg Trending
            </div>
            <div className="text-2xl font-bold">{insights.avgTrendingScore}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              Avg CPM
            </div>
            <div className="text-2xl font-bold">
              {insights.avgCPM != null ? `$${insights.avgCPM}` : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart3 className="h-4 w-4" />
              Engagement
            </div>
            <div className="text-2xl font-bold">
              {insights.totalViews > 0
                ? `${(((insights.totalLikes + insights.totalComments) / insights.totalViews) * 100).toFixed(1)}%`
                : "0%"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best & Worst Videos */}
      <div className="grid md:grid-cols-2 gap-4">
        {insights.bestVideo && (
          <Card className="glass-card border-green-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" />
                Best Performing Video
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/studio/edit/${insights.bestVideo.id}`}
                className="hover:underline font-medium"
              >
                {insights.bestVideo.title}
              </Link>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCount(insights.bestVideo.viewCount)} views
              </p>
            </CardContent>
          </Card>
        )}

        {insights.worstVideo && insights.videoCount > 1 && (
          <Card className="glass-card border-orange-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-500" />
                Needs Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/studio/edit/${insights.worstVideo.id}`}
                className="hover:underline font-medium"
              >
                {insights.worstVideo.title}
              </Link>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCount(insights.worstVideo.viewCount)} views
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Content DNA Distribution */}
      {insights.contentDNA.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-500" />
              Content DNA Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Mood distribution */}
              <div>
                <h4 className="text-sm font-medium mb-2">Mood Profile</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(
                    insights.contentDNA.reduce(
                      (acc: Record<string, number>, dna) => {
                        acc[dna.mood] = (acc[dna.mood] || 0) + 1;
                        return acc;
                      },
                      {}
                    )
                  ).map(([mood, count]) => (
                    <Badge
                      key={mood}
                      className={moodColors[mood] ?? "bg-gray-100 text-gray-800"}
                    >
                      {mood} ({count})
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Storytelling styles */}
              <div>
                <h4 className="text-sm font-medium mb-2">Storytelling Styles</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(
                    insights.contentDNA.reduce(
                      (acc: Record<string, number>, dna) => {
                        acc[dna.storytellingStyle] = (acc[dna.storytellingStyle] || 0) + 1;
                        return acc;
                      },
                      {}
                    )
                  ).map(([style, count]) => (
                    <Badge key={style} variant="outline">
                      {style} ({count})
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Energy levels */}
              <div>
                <h4 className="text-sm font-medium mb-2">Energy Levels</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(
                    insights.contentDNA.reduce(
                      (acc: Record<string, number>, dna) => {
                        acc[dna.energyLevel] = (acc[dna.energyLevel] || 0) + 1;
                        return acc;
                      },
                      {}
                    )
                  ).map(([level, count]) => (
                    <span
                      key={level}
                      className={`text-sm font-medium ${energyColors[level] ?? "text-gray-500"}`}
                    >
                      ⚡ {level} ({count})
                    </span>
                  ))}
                </div>
              </div>

              {/* Audience Types */}
              <div>
                <h4 className="text-sm font-medium mb-2">Target Audiences</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    ...new Set(insights.contentDNA.map((d) => d.audienceType)),
                  ].map((audience) => (
                    <Badge key={audience} variant="secondary">
                      {audience}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Quick AI Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link href="/studio/ai-dashboard/script-coach">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <Brain className="h-5 w-5 text-purple-500" />
                <div className="text-left">
                  <div className="font-medium">Script Coach</div>
                  <div className="text-xs text-muted-foreground">
                    Analyze any script for performance
                  </div>
                </div>
              </Button>
            </Link>

            <Link href="/feed/trending">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                <div className="text-left">
                  <div className="font-medium">Trending Formula</div>
                  <div className="text-xs text-muted-foreground">
                    View the open trending algorithm
                  </div>
                </div>
              </Button>
            </Link>

            <Link href="/studio/analytics">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <BarChart3 className="h-5 w-5 text-green-500" />
                <div className="text-left">
                  <div className="font-medium">Analytics</div>
                  <div className="text-xs text-muted-foreground">
                    Detailed channel statistics
                  </div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
