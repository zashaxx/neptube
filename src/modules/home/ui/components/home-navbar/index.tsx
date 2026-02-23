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
    <nav className="fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-xl border-b border-border/50 z-50">
      <div className="flex items-center h-full px-2 sm:px-3 gap-1 sm:gap-2 lg:gap-4">
        {/* Menu and logo */}
        <div className="flex items-center flex-shrink-0">
          <SidebarTrigger />
          <Link href="/">
            <div className="px-1 sm:px-2 flex items-center gap-1.5 sm:gap-2">
              <Image src="/logo.svg" height={26} width={26} alt="logo" />
              <p className="text-base sm:text-lg font-bold tracking-tight gradient-text hidden sm:block">NepTube</p>
            </div>
          </Link>
        </div>

        {/* Search bar - centered, responsive width */}
        <div className="flex-1 flex justify-center min-w-0 px-1 sm:px-2">
          <Suspense fallback={<div className="w-full max-w-[520px] h-9 bg-muted rounded-lg animate-pulse" />}>
            <SearchInput />
          </Suspense>
        </div>

        {/* Action buttons - properly spaced, responsive */}
        <div className="flex items-center flex-shrink-0 gap-0.5 sm:gap-1">
          <div className="hidden lg:flex items-center gap-0.5">
            <CommandPaletteTrigger />
          </div>
          <AdminNavButton />
          <Link href="/studio/upload" className="hidden sm:block">
            <Button variant="ghost" size="icon" title="Upload video" className="rounded-lg h-9 w-9">
              <Upload className="h-[18px] w-[18px]" />
            </Button>
          </Link>
          <Link href="/studio" className="hidden md:block">
            <Button variant="ghost" size="icon" title="Creator Studio" className="rounded-lg h-9 w-9">
              <Video className="h-[18px] w-[18px]" />
            </Button>
          </Link>
          <NotificationBell />
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </nav>
  );
};
