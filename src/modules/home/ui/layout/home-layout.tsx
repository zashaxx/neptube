import { SidebarProvider } from "@/components/ui/sidebar";
import { HomeNavbar } from "../components/home-navbar";
import { HomeSidebar } from "../components/home-sidebar";
import { MiniPlayerProvider } from "@/components/mini-player";
import { CommandPalette } from "@/components/command-palette";
import { BottomDock } from "@/components/bottom-dock";

interface HomeLayoutProps {
  children: React.ReactNode;
}

export const HomeLayout = ({ children }: HomeLayoutProps) => {
  return (
    <SidebarProvider>
      <MiniPlayerProvider>
        <div className="w-full noise-overlay">
          {/* Aurora gradient background */}
          <div className="aurora-bg" />
          <HomeNavbar/>
          <CommandPalette />
          <div className="flex min-h-screen pt-14">
            <HomeSidebar/>
              <main className="flex-1 overflow-y-auto pb-16 sm:pb-0">
                  {children}
              </main>
            </div>
          <BottomDock />
        </div>
      </MiniPlayerProvider>
    </SidebarProvider>
  );
};

// to use tailwinf css in module folder need to make changes in taiwindconfig gile
//"./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
