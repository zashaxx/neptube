import { Sidebar } from "@/components/ui/sidebar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar className="w-64" /> {/* Fixed width sidebar */}
      <main className="flex-1">
        {children} {/* Main content */}
      </main>
    </div>
  );
}
