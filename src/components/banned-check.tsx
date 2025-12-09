"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { trpc } from "@/trpc/client";

export function BannedCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  
  // Only query if user is signed in - use getByClerkId to avoid protected procedure
  const { data: currentUser, isLoading } = trpc.users.getByClerkId.useQuery(
    { clerkId: "" }, // Will be overridden by enabled condition
    { enabled: false } // Disabled by default
  );

  // Use a simpler approach - check via API
  useEffect(() => {
    const checkBanned = async () => {
      if (!isSignedIn) return;
      
      try {
        const response = await fetch("/api/check-banned");
        const data = await response.json();
        if (data.isBanned) {
          router.replace("/banned");
        }
      } catch {
        // Ignore errors
      }
    };

    checkBanned();
  }, [isSignedIn, router]);

  return <>{children}</>;
}
