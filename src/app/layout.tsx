import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { TRPCProvider } from "@/trpc/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BannedCheck } from "@/components/banned-check";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Strip Bitdefender extension attributes before React hydration
              new MutationObserver(function(mutations, observer) {
                mutations.forEach(function(m) {
                  if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked') {
                    m.target.removeAttribute('bis_skin_checked');
                  }
                  if (m.type === 'childList') {
                    m.addedNodes.forEach(function(n) {
                      if (n.nodeType === 1) {
                        n.removeAttribute && n.removeAttribute('bis_skin_checked');
                        if (n.querySelectorAll) {
                          n.querySelectorAll('[bis_skin_checked]').forEach(function(el) {
                            el.removeAttribute('bis_skin_checked');
                          });
                        }
                      }
                    });
                  }
                });
              }).observe(document.documentElement, { attributes: true, attributeFilter: ['bis_skin_checked'], childList: true, subtree: true });
            `,
          }}
        />
      </head>
      <body className={inter.variable} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ClerkProvider>
            <TRPCProvider>
              <SidebarProvider>
                <BannedCheck>
                  <div className="flex min-h-screen">
                    <main className="flex-1">{children}</main>
                  </div>
                  <Toaster richColors position="bottom-right" />
                </BannedCheck>
              </SidebarProvider>
            </TRPCProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
