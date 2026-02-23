"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(
    undefined,
    { enabled: !!isSignedIn, refetchInterval: 30000 }
  );

  const { data: notifications } = trpc.notifications.getMyNotifications.useQuery(
    { limit: 10 },
    { enabled: !!isSignedIn && open }
  );

  const utils = trpc.useUtils();
  const markAllRead = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnreadCount.invalidate();
      utils.notifications.getMyNotifications.invalidate();
    },
  });

  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnreadCount.invalidate();
      utils.notifications.getMyNotifications.invalidate();
    },
  });

  if (!isSignedIn) return null;

  const count = Number(unreadCount ?? 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Notifications"
          className="rounded-lg relative"
        >
          <Bell className="h-4.5 w-4.5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {count > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!notifications || notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${
                    !notif.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  {notif.link ? (
                    <Link
                      href={notif.link}
                      onClick={() => {
                        if (!notif.isRead) markAsRead.mutate({ id: notif.id });
                        setOpen(false);
                      }}
                      className="block"
                    >
                      <p className="text-sm font-medium leading-tight">
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </Link>
                  ) : (
                    <div
                      onClick={() => {
                        if (!notif.isRead) markAsRead.mutate({ id: notif.id });
                      }}
                      className="cursor-pointer"
                    >
                      <p className="text-sm font-medium leading-tight">
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
