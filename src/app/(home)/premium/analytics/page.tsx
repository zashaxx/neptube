"use client";

import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Crown,
  TrendingUp,
  DollarSign,
  Eye,
  Clock,
  BarChart3,
  Users,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

function formatNPR(paisa: number): string {
  return `NPR ${(paisa / 100).toLocaleString("en-NP", { minimumFractionDigits: 0 })}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AnalyticsDashboardPage() {
  const { data: subscription, isLoading: subLoading } = trpc.premium.getMySubscription.useQuery();
  const { data: earnings, isLoading: earningsLoading } = trpc.premium.getCreatorEarnings.useQuery(
    undefined,
    { enabled: subscription?.tier === "vip" }
  );
  const { data: watchStats, isLoading: watchLoading } = trpc.premium.getWatchTimeAnalytics.useQuery(
    undefined,
    { enabled: subscription?.tier === "vip" }
  );

  if (subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (subscription?.tier !== "vip") {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-8">
        <Crown className="h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">VIP Analytics Dashboard</h1>
        <p className="text-gray-400 text-center max-w-md mb-6">
          Access detailed analytics about your channel performance, earnings, and
          audience engagement. Available exclusively for VIP members.
        </p>
        <Link
          href="/premium"
          className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-6 py-2 rounded-lg font-bold hover:from-yellow-400 hover:to-amber-400 transition-all"
        >
          Upgrade to VIP
        </Link>
      </div>
    );
  }

  const isLoading = earningsLoading || watchLoading;

  return (
    <div className="min-h-screen bg-neutral-900 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-yellow-500" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-400 mt-1">VIP exclusive channel analytics</p>
          </div>
          <Badge className="bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 px-3 py-1">
            <Crown className="h-3 w-3 mr-1" />
            VIP
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="bg-neutral-800 border-neutral-700">
                <CardContent className="p-6">
                  <div className="h-16 bg-neutral-700 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Earnings Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-900/30 to-neutral-800 border-green-800/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-400 font-medium uppercase">Total Earnings</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {formatNPR(earnings?.totalEarnings || 0)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-900/30 to-neutral-800 border-yellow-800/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-yellow-400 font-medium uppercase">Unpaid Balance</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {formatNPR(earnings?.unpaidEarnings || 0)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-yellow-500/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-900/30 to-neutral-800 border-blue-800/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-400 font-medium uppercase">Paid Out</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {formatNPR(earnings?.paidOutEarnings || 0)}
                      </p>
                    </div>
                    <ArrowUpRight className="h-8 w-8 text-blue-500/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Earnings by Source */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-neutral-800 border-neutral-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    Earnings by Source
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!earnings?.earningsBySource.length ? (
                    <p className="text-gray-500 text-center py-4">No earnings yet</p>
                  ) : (
                    <div className="space-y-3">
                      {earnings.earningsBySource.map((item) => (
                        <div
                          key={item.source}
                          className="flex items-center justify-between p-3 bg-neutral-700/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                item.source === "super_chat"
                                  ? "bg-yellow-600/20 text-yellow-400"
                                  : item.source === "tip"
                                  ? "bg-purple-600/20 text-purple-400"
                                  : "bg-blue-600/20 text-blue-400"
                              }`}
                            >
                              {item.source === "super_chat" ? (
                                <MessageSquare className="h-4 w-4" />
                              ) : item.source === "tip" ? (
                                <DollarSign className="h-4 w-4" />
                              ) : (
                                <BarChart3 className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm text-white capitalize">
                                {item.source.replace("_", " ")}
                              </p>
                              <p className="text-xs text-gray-400">{item.count} transactions</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-green-400">
                            {formatNPR(item.total)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Trend */}
              <Card className="bg-neutral-800 border-neutral-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    Monthly Earnings Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!earnings?.monthlyTrend.length ? (
                    <p className="text-gray-500 text-center py-4">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {earnings.monthlyTrend.map((month) => {
                        const maxAmount = Math.max(
                          ...earnings.monthlyTrend.map((m) => m.total),
                          1
                        );
                        const percentage = (month.total / maxAmount) * 100;

                        return (
                          <div key={month.month} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">{month.month}</span>
                              <span className="text-white font-medium">
                                {formatNPR(month.total)}
                              </span>
                            </div>
                            <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Watch Time Analytics */}
            <Card className="bg-neutral-800 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-400" />
                  Watch Time Analytics
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Engagement stats for your channel&apos;s videos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-neutral-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <Users className="h-3 w-3" /> Unique Viewers
                    </div>
                    <p className="text-lg font-bold text-white">
                      {Number(watchStats?.overview?.unique_viewers || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-neutral-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <Eye className="h-3 w-3" /> Total Views
                    </div>
                    <p className="text-lg font-bold text-white">
                      {Number(watchStats?.overview?.total_views || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-neutral-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <Clock className="h-3 w-3" /> Total Watch Time
                    </div>
                    <p className="text-lg font-bold text-white">
                      {formatDuration(Number(watchStats?.overview?.total_watch_time || 0))}
                    </p>
                  </div>
                  <div className="bg-neutral-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <Clock className="h-3 w-3" /> Avg Watch Duration
                    </div>
                    <p className="text-lg font-bold text-white">
                      {formatDuration(Number(watchStats?.overview?.avg_watch_duration || 0))}
                    </p>
                  </div>
                </div>

                {/* Top Videos by Watch Time */}
                <h3 className="text-sm font-medium text-gray-300 mb-3">Top Videos by Watch Time</h3>
                {!watchStats?.topVideos?.length ? (
                  <p className="text-gray-500 text-center py-4">No video data yet</p>
                ) : (
                  <div className="space-y-2">
                    {(watchStats.topVideos as Record<string, unknown>[]).map((video, idx) => (
                      <div
                        key={String(video.id)}
                        className="flex items-center gap-3 p-3 bg-neutral-700/50 rounded-lg"
                      >
                        <span className="text-xs text-gray-500 w-5">#{idx + 1}</span>
                        <div
                          className="w-16 h-10 bg-neutral-600 rounded bg-cover bg-center flex-shrink-0"
                          style={{
                            backgroundImage: video.thumbnail_url
                              ? `url(${String(video.thumbnail_url)})`
                              : undefined,
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{String(video.title)}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                            <span>{Number(video.view_count || 0).toLocaleString()} views</span>
                            <span>{Number(video.unique_viewers || 0).toLocaleString()} unique</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-purple-400">
                            {formatDuration(Number(video.total_watch_time || 0))}
                          </p>
                          <p className="text-xs text-gray-400">
                            avg {formatDuration(Number(video.avg_watch_duration || 0))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Earnings */}
            <Card className="bg-neutral-800 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Recent Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                {!earnings?.recentEarnings.length ? (
                  <p className="text-gray-500 text-center py-4">No recent earnings</p>
                ) : (
                  <div className="space-y-2">
                    {earnings.recentEarnings.map((earning) => (
                      <div
                        key={earning.id}
                        className="flex items-center justify-between p-2 hover:bg-neutral-700/30 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              earning.isPaidOut ? "bg-gray-500" : "bg-green-500"
                            }`}
                          />
                          <span className="text-sm text-gray-300 capitalize">
                            {earning.source.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-green-400">
                            +{formatNPR(earning.amount)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(earning.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
