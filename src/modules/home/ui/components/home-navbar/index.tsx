import { Suspense } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";
import Image from "next/image";

import { SearchInput } from "./search-input";
import { AuthButton } from "@/modules/auth/ui/components/auth-button";
import { Button } from "@/components/ui/button";
import { Video, Upload } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { CommandPaletteTrigger } from "./command-palette-trigger";
import { AdminNavButton } from "./admin-nav-button";


export const HomeNavbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-background/70 backdrop-blur-xl border-b border-border/50 flex items-center px-3 pr-5 z-50">
      <div className="flex items-center gap-4 w-full">
        {/* Menu and logo */}
        <div className="flex items-center flex-shrink-0">
          <SidebarTrigger />
          <Link href="/">
            <div className="px-3 flex items-center gap-2">
              <Image src="/logo.svg" height={28} width={28} alt="logo" />
              <p className="text-lg font-bold tracking-tight gradient-text">NepTube</p>
            </div>
          </Link>
        </div>
        {/* search bar */}
        <div className="flex-1 flex justify-center mx-auto">
                <Suspense fallback={<div className="w-full max-w-[520px] h-9 bg-muted rounded-lg animate-pulse" />}>
                  <SearchInput/>
                </Suspense>
        </div>
        <div className="flex-shrink-0 items-center flex gap-1">
              <CommandPaletteTrigger />
              <AdminNavButton />
              <Link href="/studio/upload">
                <Button variant="ghost" size="icon" title="Upload video" className="rounded-lg">
                  <Upload className="h-4.5 w-4.5" />
                </Button>
              </Link>
              <Link href="/studio">
                <Button variant="ghost" size="icon" title="Creator Studio" className="rounded-lg">
                  <Video className="h-4.5 w-4.5" />
                </Button>
              </Link>
              <NotificationBell />
              <ThemeToggle />
              <AuthButton/>
        </div>
      </div>
    </nav>
  );
};
