"use client";

import { trpc } from "@/trpc/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const AdminNavButton = () => {
  const { data: currentUser } = trpc.users.me.useQuery(undefined, {
    staleTime: 60_000,
  });

  if (currentUser?.role !== "admin") return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/admin">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-full hover:bg-red-500/10 group"
            >
              <ShieldCheck className="h-5 w-5 text-red-500 group-hover:text-red-400 transition-colors" />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Admin Panel</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
