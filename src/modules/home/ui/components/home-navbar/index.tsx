import { SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";
import Image from "next/image";

import { SearchInput } from "./search-input";
import { AuthButton } from "@/modules/auth/ui/components/auth-button";
import { Button } from "@/components/ui/button";
import { Video, Upload } from "lucide-react";


export const HomeNavbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white flex items-center px-2 pr-5 z-50">
      <div className="flex items-center gap-4 w-full">
        {/* Menu and logo */}
        <div className="flex items-center flex-shrink-0">
          <SidebarTrigger />
          <Link href="/">
            <div className="px-4 flex items-center gap-1">
              <Image src="/logo.svg" height={32} width={32} alt="logo" />
              <p className="text-xl font-semibold tracking-tight">NepTube</p>
            </div>
          </Link>
        </div>
        {/* search bar */}
        <div className="flex-1 flex justify-center max-w-[720px] mx-auto">
                <SearchInput/>
        </div>
        <div className="flex-shrink-0 items-center flex gap-4">
              <Link href="/studio/upload">
                <Button variant="ghost" size="icon" title="Upload video">
                  <Upload className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/studio">
                <Button variant="ghost" size="icon" title="Creator Studio">
                  <Video className="h-5 w-5" />
                </Button>
              </Link>
              <AuthButton/>
        </div>
      </div>
    </nav>
  );
};
