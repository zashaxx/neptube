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
  refunded: "text-primary",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-4 w-4" />,
  pending: <Clock className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  refunded: <AlertCircle className="h-4 w-4" />,
};

const TIER_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  lite: "bg-primary text-white",
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
          <Crown className="h-8 w-8 text-yellow-500" />
          Premium Management
        </h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-500 font-medium uppercase">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatNPR(Number(stats?.revenue?.totalRevenue) || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary font-medium uppercase">Completed Payments</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {Number(stats?.revenue?.completedPayments) || 0}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-500 font-medium uppercase">Pending Payments</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {Number(stats?.revenue?.pendingPayments) || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-destructive font-medium uppercase">Failed Payments</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {Number(stats?.revenue?.failedPayments) || 0}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tier Distribution */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
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
                  <div key={tier} className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={TIER_COLORS[tier]}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </Badge>
                      <span className="text-lg font-bold text-foreground">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          tier === "vip"
                            ? "bg-yellow-500"
                            : tier === "premium"
                            ? "bg-purple-500"
                            : tier === "lite"
                            ? "bg-primary"
                            : "bg-muted-foreground/30"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{percentage}% of users</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="bg-muted mb-4">
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
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                  ) : !data?.length ? (
                    <p className="text-muted-foreground text-center py-4">No payments found</p>
                  ) : (
                    <div className="space-y-2">
                      {data.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/50 rounded-lg gap-2"
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
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                {payment.user.name[0]}
                              </div>
                            )}
                            <div>
                              <p className="text-sm text-foreground">{payment.user.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <Badge className={`${TIER_COLORS[payment.tier]} text-[10px] px-1 py-0`}>
                                  {payment.tier}
                                </Badge>
                                <span>via {payment.gateway}</span>
                                <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-11 sm:ml-0">
                            <span className="text-sm font-bold text-foreground">
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
