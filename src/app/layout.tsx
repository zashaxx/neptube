import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { TRPCProvider } from "@/trpc/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BannedCheck } from "@/components/banned-check";

export const metadata: Metadata = {
  title: "NepTube - Share Your Videos with the World",
  description: "NepTube is a video sharing platform where you can upload, watch, and share videos with the world.",
  icons: {
    icon: "/favicon.ico",
  },
};

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
