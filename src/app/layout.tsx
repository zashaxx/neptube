import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { TRPCProvider } from "@/trpc/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BannedCheck } from "@/components/banned-check";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ClerkProvider>
          <TRPCProvider>
            <SidebarProvider>
              <BannedCheck>
                <div className="flex min-h-screen">
                  <main className="flex-1">{children}</main>
                </div>
              </BannedCheck>
            </SidebarProvider>
          </TRPCProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
