import { SidebarProvider } from "@/components/ui/sidebar";
import { HomeNavbar } from "../components/home-navbar";
import { HomeSidebar } from "../components/home-sidebar";

interface HomeLayoutProps {
  children: React.ReactNode;
}

export const HomeLayout = ({ children }: HomeLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="w-full noise-overlay">
        {/* Aurora gradient background */}
        <div className="aurora-bg" />
        <HomeNavbar/>
        <div className="flex min-h-screen pt-14">
          <HomeSidebar/>
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
          </div>
      </div>
    </SidebarProvider>
  );
};

// to use tailwinf css in module folder need to make changes in taiwindconfig gile
//"./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
