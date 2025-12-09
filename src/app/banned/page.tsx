"use client";

import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function BannedPage() {
  const { signOut } = useClerk();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md p-8">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-red-100 p-4">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Account Suspended
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your account has been suspended due to a violation of our community
          guidelines. If you believe this is a mistake, please contact our
          support team.
        </p>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signOut({ redirectUrl: "/" })}
          >
            Sign Out
          </Button>
          <a
            href="mailto:support@neptube.com"
            className="block text-sm text-blue-600 hover:underline"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
