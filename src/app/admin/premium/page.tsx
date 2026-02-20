"use client";

import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Crown,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";

function formatNPR(paisa: number): string {
  return `NPR ${(paisa / 100).toLocaleString()}`;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "text-green-400",
  pending: "text-yellow-400",
  failed: "text-red-400",
  refunded: "text-blue-400",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-4 w-4" />,
  pending: <Clock className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  refunded: <AlertCircle className="h-4 w-4" />,
};

const TIER_COLORS: Record<string, string> = {
  free: "bg-gray-700 text-gray-300",
  lite: "bg-blue-600 text-white",
  premium: "bg-purple-600 text-white",
  vip: "bg-yellow-600 text-black",
};

export default function AdminPremiumPage() {
  const { data: stats, isLoading: statsLoading } = trpc.premium.getSubscriptionStats.useQuery();
  const { data: allPayments, isLoading: paymentsLoading } = trpc.premium.getAdminPayments.useQuery({ limit: 50 });
  const { data: completedPayments } = trpc.premium.getAdminPayments.useQuery({ status: "completed", limit: 50 });
  const { data: pendingPayments } = trpc.premium.getAdminPayments.useQuery({ status: "pending", limit: 50 });

  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Crown className="h-8 w-8 text-yellow-500" />
          Premium Management
        </h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-green-900/20 border-green-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-400 font-medium uppercase">Total Revenue</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatNPR(Number(stats?.revenue?.totalRevenue) || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-900/20 border-blue-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 font-medium uppercase">Completed Payments</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {Number(stats?.revenue?.completedPayments) || 0}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-900/20 border-yellow-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-400 font-medium uppercase">Pending Payments</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {Number(stats?.revenue?.pendingPayments) || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-900/20 border-red-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-400 font-medium uppercase">Failed Payments</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {Number(stats?.revenue?.failedPayments) || 0}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tier Distribution */}
        <Card className="bg-neutral-800 border-neutral-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Subscription Tier Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(["free", "lite", "premium", "vip"] as const).map((tier) => {
                const tierData = stats?.tierDistribution.find((t) => t.tier === tier);
                const count = tierData?.count ?? 0;
                const total = stats?.tierDistribution.reduce((sum, t) => sum + (t.count || 0), 0) || 1;
                const percentage = Math.round((count / total) * 100);

                return (
                  <div key={tier} className="bg-neutral-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={TIER_COLORS[tier]}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </Badge>
                      <span className="text-lg font-bold text-white">{count}</span>
                    </div>
                    <div className="h-2 bg-neutral-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          tier === "vip"
                            ? "bg-yellow-500"
                            : tier === "premium"
                            ? "bg-purple-500"
                            : tier === "lite"
                            ? "bg-blue-500"
                            : "bg-gray-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{percentage}% of users</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card className="bg-neutral-800 border-neutral-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="bg-neutral-700 mb-4">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
              </TabsList>

              {(
                [
                  { key: "all", data: allPayments, loading: paymentsLoading },
                  { key: "completed", data: completedPayments, loading: false },
                  { key: "pending", data: pendingPayments, loading: false },
                ] as const
              ).map(({ key, data, loading }) => (
                <TabsContent key={key} value={key}>
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
                  ) : !data?.length ? (
                    <p className="text-gray-500 text-center py-4">No payments found</p>
                  ) : (
                    <div className="space-y-2">
                      {data.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 bg-neutral-700/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {payment.user.imageURL ? (
                              <Image
                                src={payment.user.imageURL}
                                alt={payment.user.name}
                                width={32}
                                height={32}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-neutral-600 flex items-center justify-center text-xs text-gray-400">
                                {payment.user.name[0]}
                              </div>
                            )}
                            <div>
                              <p className="text-sm text-white">{payment.user.name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Badge className={`${TIER_COLORS[payment.tier]} text-[10px] px-1 py-0`}>
                                  {payment.tier}
                                </Badge>
                                <span>via {payment.gateway}</span>
                                <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white">
                              {formatNPR(payment.amount)}
                            </span>
                            <span className={`flex items-center gap-1 text-xs ${STATUS_COLORS[payment.status]}`}>
                              {STATUS_ICONS[payment.status]}
                              {payment.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
