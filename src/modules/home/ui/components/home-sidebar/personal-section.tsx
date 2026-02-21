"use client";

import { 
    SidebarGroup, 
    SidebarGroupContent, 
    SidebarGroupLabel, 
    SidebarMenu, 
    SidebarMenuButton , 
    SidebarMenuItem 
} from "@/components/ui/sidebar";
import { Clock, Heart, ListVideo, UserCircle, Bookmark, FolderOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth, useClerk } from "@clerk/nextjs";

const items = [
    { title:"Your Channel", url:"/channel", icon:UserCircle, color:"from-violet-500 to-purple-500", auth:true },
    { title:"Saved", url:"/playlists?tab=watch-later", icon:Bookmark, color:"from-blue-500 to-indigo-500", auth:true },
    { title:"History", url:"/history", icon:Clock, color:"from-slate-400 to-zinc-500", auth:true },
    { title:"Liked", url:"/liked", icon:Heart, color:"from-rose-500 to-pink-500", auth:true },
    { title:"Collections", url:"/playlists", icon:FolderOpen, color:"from-amber-500 to-yellow-500", auth:true },
];

export const PersonalSection = () => {
    const clerk = useClerk();
    const { isSignedIn, isLoaded } = useAuth();
    const pathname = usePathname();

    return (
        <SidebarGroup>
            <SidebarGroupLabel className="neptube-section-label">
                <span className="neptube-section-dot bg-gradient-to-br from-pink-500 to-rose-500" />
                Library
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5 px-1">
                    {items.map((item) => {
                        const isActive = pathname === item.url ||
                            (item.url !== "/" && pathname.startsWith(item.url.split("?")[0]));
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    tooltip={item.title}
                                    asChild
                                    isActive={isActive}
                                    className={`neptune-nav-item group/nav ${
                                        isActive ? "neptube-nav-active" : ""
                                    }`}
                                    onClick={(e) => {
                                        if (!isLoaded) return;
                                        if (!isSignedIn && item.auth) {
                                            e.preventDefault();
                                            clerk.openSignIn();
                                        }
                                    }}
                                >
                                    <Link href={item.url} className="flex items-center gap-3">
                                        <span className={`neptube-icon-badge bg-gradient-to-br ${item.color}`}>
                                            <item.icon className="h-3.5 w-3.5 text-white" />
                                        </span>
                                        <span className="text-[13px] font-semibold tracking-tight">{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
};
