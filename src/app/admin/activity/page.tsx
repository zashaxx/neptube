"use client";

import { trpc } from "@/trpc/client";
import { useState } from "react";
import {
  Shield,
  Flag,
  AlertTriangle,
  Clock,
  UserPlus,
  Ban,
  MessageSquareWarning,
  Eye,
  Filter,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const typeConfig = {
  ban: {
    icon: Ban,
    color: "text-red-600 bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-700",
  },
  report: {
    icon: Flag,
    color: "text-orange-600 bg-orange-50 border-orange-200",
    badge: "bg-orange-100 text-orange-700",
  },
  toxic_comment: {
    icon: MessageSquareWarning,
    color: "text-red-600 bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-700",
  },
  pending_video: {
    icon: Clock,
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700",
  },
  nsfw_video: {
    icon: Eye,
    color: "text-purple-600 bg-purple-50 border-purple-200",
    badge: "bg-purple-100 text-purple-700",
  },
  new_user: {
    icon: UserPlus,
    color: "text-primary bg-primary/10 border-primary/30",
    badge: "bg-primary/10 text-primary",
  },
};

const typeLabels: Record<string, string> = {
  ban: "User Ban",
  report: "Report",
  toxic_comment: "Toxic Comment",
  pending_video: "Pending Video",
  nsfw_video: "NSFW Video",
  new_user: "New User",
};

const filterTypes = [
  { value: "all", label: "All Activity" },
  { value: "ban", label: "Bans" },
  { value: "report", label: "Reports" },
  { value: "toxic_comment", label: "Toxic Comments" },
  { value: "pending_video", label: "Pending Videos" },
  { value: "nsfw_video", label: "NSFW Videos" },
  { value: "new_user", label: "New Users" },
] as const;

const dayOptions = [
  { value: 1, label: "24 hours" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const;

export default function AdminActivityPage() {
  const [days, setDays] = useState(7);
  const [filterType, setFilterType] = useState("all");

  const { data: activities, isLoading } = trpc.admin.getRecentActivity.useQuery(
    { limit: 100, days }
  );

  const filtered = activities?.filter(
    (a) => filterType === "all" || a.type === filterType
  );

  const severityCounts = {
    danger: filtered?.filter((a) => a.severity === "danger").length ?? 0,
    warning: filtered?.filter((a) => a.severity === "warning").length ?? 0,
    info: filtered?.filter((a) => a.severity === "info").length ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Activity Log</h1>
            <p className="text-sm text-muted-foreground">
              Recent platform events and moderation activity
            </p>
          </div>
        </div>

        {/* Severity summary badges */}
        <div className="flex items-center gap-2">
          {severityCounts.danger > 0 && (
            <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              {severityCounts.danger} critical
            </span>
          )}
          {severityCounts.warning > 0 && (
            <span className="px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
              {severityCounts.warning} warnings
            </span>
          )}
          <span className="px-2.5 py-1 text-xs font-medium bg-muted text-foreground rounded-full">
            {filtered?.length ?? 0} total
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-lg border shadow-sm">
        <Filter className="h-4 w-4 text-muted-foreground" />

        {/* Type filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {filterTypes.map((ft) => (
            <button
              key={ft.value}
              onClick={() => setFilterType(ft.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                filterType === ft.value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              }`}
            >
              {ft.label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-muted" />

        {/* Time range pills */}
        <div className="flex gap-1.5">
          {dayOptions.map((d) => (
            <button
              key={d.value}
              onClick={() => setDays(d.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                days === d.value
                  ? "bg-card text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-lg border p-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
                <div className="h-3 bg-muted rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-muted" />

          <div className="space-y-3">
            {filtered.map((activity) => {
              const config = typeConfig[activity.type];
              const Icon = config.icon;

              return (
                <div
                  key={activity.id}
                  className={`relative flex items-start gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow ${
                    activity.severity === "danger"
                      ? "border-l-4 border-l-red-400"
                      : activity.severity === "warning"
                      ? "border-l-4 border-l-yellow-400"
                      : ""
                  }`}
                >
                  {/* Icon circle */}
                  <div
                    className={`relative z-10 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border ${config.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-foreground text-sm">
                        {activity.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider ${config.badge}`}
                      >
                        {typeLabels[activity.type]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {activity.description}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-lg border">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-foreground">No activity found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {filterType !== "all"
              ? "Try changing the filter or time range"
              : `No events in the last ${days} days`}
          </p>
        </div>
      )}
    </div>
  );
}
