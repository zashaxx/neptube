"use client"

import { 
    SidebarGroup, 
    SidebarGroupContent, 
    SidebarGroupLabel,
    SidebarMenu, 
    SidebarMenuButton , 
    SidebarMenuItem 
} from "@/components/ui/sidebar";
import { TrendingUp, Home, Zap, Users, Radio, Compass } from "lucide-react"
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth, useClerk } from "@clerk/nextjs";

const items = [
    { title:"Home", url:"/", icon:Home, color:"from-violet-500 to-indigo-500", badge: null },
    { title:"Shorts", url:"/shorts", icon:Zap, color:"from-amber-500 to-orange-500", badge: null },
    { title:"Live", url:"/feed/live", icon:Radio, color:"from-rose-500 to-pink-500", badge: "NEW", auth:true },
    { title:"Trending", url:"/feed/trending", icon:TrendingUp, color:"from-emerald-500 to-teal-500", badge: null },
    { title:"Explore", url:"/community", icon:Compass, color:"from-sky-500 to-cyan-500", badge: null, auth:true },
];

export const MainSection = () => {

    const clerk = useClerk();
    const { isSignedIn, isLoaded } = useAuth();
    const pathname = usePathname();

    return (
        <SidebarGroup>
            <SidebarGroupLabel className="neptube-section-label">
                <span className="neptube-section-dot" />
                Discover
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5 px-1">
                    {items.map((item) => {
                        const isActive = pathname === item.url || 
                            (item.url !== "/" && pathname.startsWith(item.url));
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    tooltip={item.title}
                                    asChild
                                    isActive={isActive}
                                    className={`neptube-nav-item group/nav ${
                                        isActive ? "neptube-nav-active" : ""
                                    }`}
                                    onClick={(e) => {
                                        if (!isLoaded) return;
                                        if (!isSignedIn && item.auth) {
                                            e.preventDefault();
                                            return clerk.openSignIn();
                                        }
                                    }}
                                >
                                    <Link href={item.url} className="flex items-center gap-3">
                                        <span className={`neptube-icon-badge bg-gradient-to-br ${item.color}`}>
                                            <item.icon className="h-3.5 w-3.5 text-white" />
                                        </span>
                                        <span className="text-[13px] font-semibold tracking-tight">{item.title}</span>
                                        {item.badge && (
                                            <span className="ml-auto text-[9px] font-bold tracking-wider text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}
