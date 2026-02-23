"use client";

import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Video, MessageSquare, Eye, Ban, Clock, AlertTriangle, Shield, Brain, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.getStats.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold gradient-text">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <Card key={i} className="animate-pulse glass-card border-border/50">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
      href: "/admin/users",
    },
    {
      title: "Total Videos",
      value: stats?.totalVideos ?? 0,
      icon: Video,
      color: "text-green-600",
      bgColor: "bg-green-100",
      href: "/admin/videos",
    },
    {
      title: "Total Comments",
      value: stats?.totalComments ?? 0,
      icon: MessageSquare,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      href: "/admin/comments",
    },
    {
      title: "Total Views",
      value: stats?.totalViews ?? 0,
      icon: Eye,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      href: null,
    },
    {
      title: "Banned Users",
      value: stats?.bannedUsers ?? 0,
      icon: Ban,
      color: "text-red-600",
      bgColor: "bg-red-100",
      href: "/admin/users/banned",
    },
    {
      title: "Pending Videos",
      value: stats?.pendingVideos ?? 0,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      href: "/admin/videos/pending",
    },
    {
      title: "NSFW Flagged",
      value: stats?.nsfwVideos ?? 0,
      icon: AlertTriangle,
      color: "text-pink-600",
      bgColor: "bg-pink-100",
      href: "/admin/videos/nsfw",
    },
    {
      title: "Toxic Comments",
      value: stats?.toxicComments ?? 0,
      icon: Shield,
      color: "text-rose-600",
      bgColor: "bg-rose-100",
      href: "/admin/comments/toxic",
    },
    {
      title: "Auto-Hidden",
      value: stats?.hiddenComments ?? 0,
      icon: Brain,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
      href: "/admin/comments/hidden",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your NepTube platform statistics
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const cardContent = (
            <Card className={`relative glass-card border-border/50 transition-all duration-200 ${stat.href ? "hover:shadow-lg hover:scale-[1.02] cursor-pointer group" : ""}`}>
              <CardHeader className="pb-2">
                <div className={`text-2xl ${stat.color}`}>{<stat.icon />}</div>
                <CardTitle className="mt-2 text-lg font-semibold">{stat.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-bold">{stat.value}</div>
                  {stat.href && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      View <ArrowRight className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );

          if (stat.href) {
            return (
              <Link key={stat.title} href={stat.href} className="block">
                {cardContent}
              </Link>
            );
          }
          return <div key={stat.title}>{cardContent}</div>;
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/admin/users"
              className="block p-4 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Manage Users</p>
                  <p className="text-sm text-muted-foreground">
                    View, ban, or change user roles
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/videos"
              className="block p-4 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Moderate Videos</p>
                  <p className="text-sm text-muted-foreground">
                    Approve, reject, or remove videos
                  </p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Database</span>
                <span className="flex items-center gap-2 text-emerald-500">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Authentication</span>
                <span className="flex items-center gap-2 text-emerald-500">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">API</span>
                <span className="flex items-center gap-2 text-emerald-500">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">AI/ML Engine</span>
                <span className="flex items-center gap-2 text-emerald-500">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Content Moderation</span>
                <span className="flex items-center gap-2 text-emerald-500">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  Monitoring
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
