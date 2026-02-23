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
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
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
      color: "text-blue-600",
      bgColor: "bg-blue-100",
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of your NepTube platform statistics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const cardContent = (
            <Card className={`relative transition-all duration-200 ${stat.href ? "hover:shadow-lg hover:scale-[1.02] cursor-pointer group" : ""}`}>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/admin/users"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Manage Users</p>
                  <p className="text-sm text-gray-500">
                    View, ban, or change user roles
                  </p>
                </div>
              </div>
            </a>
            <a
              href="/admin/videos"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Moderate Videos</p>
                  <p className="text-sm text-gray-500">
                    Approve, reject, or remove videos
                  </p>
                </div>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database</span>
                <span className="flex items-center gap-2 text-green-600">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Authentication</span>
                <span className="flex items-center gap-2 text-green-600">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">API</span>
                <span className="flex items-center gap-2 text-green-600">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">AI/ML Engine</span>
                <span className="flex items-center gap-2 text-green-600">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Content Moderation</span>
                <span className="flex items-center gap-2 text-green-600">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
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
