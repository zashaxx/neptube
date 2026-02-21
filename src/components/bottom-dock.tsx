"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, Upload, ListVideo, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";

const dockItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/shorts", icon: Zap, label: "Shorts" },
  { href: "/studio/upload", icon: Upload, label: "Create", isCreate: true },
  { href: "/feed/subscriptions", icon: ListVideo, label: "Subs" },
  { href: "/channel", icon: User, label: "You" },
];

export function BottomDock() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      {/* Frosted glass background */}
      <div className="bg-background/80 backdrop-blur-xl border-t border-border/30 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {dockItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            if (item.isCreate) {
              return (
                <Link
                  key={item.href}
                  href={isSignedIn ? item.href : "/sign-in"}
                  className="flex flex-col items-center justify-center -mt-3"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25 magnetic-btn">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 w-14 py-1 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="text-[10px] font-medium leading-none">
                  {item.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
