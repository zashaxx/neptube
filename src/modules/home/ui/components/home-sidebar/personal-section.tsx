"use client";

import { 
    SidebarGroup, 
    SidebarGroupContent, 
    SidebarGroupLabel, 
    SidebarMenu, 
    SidebarMenuButton , 
    SidebarMenuItem 
} from "@/components/ui/sidebar";
import { Clock, ThumbsUp, ListVideo, UserCircle } from "lucide-react";
import Link from "next/link";

import { useAuth, useClerk } from "@clerk/nextjs";

const items = [
    { title:"Your Channel", url:"/channel", icon:UserCircle, auth:true },
    { title:"History", url:"/history", icon:Clock, auth:true },
    { title:"Liked videos", url:"/liked", icon:ThumbsUp, auth:true },
    { title:"All playlists", url:"/playlists", icon:ListVideo, auth:true },
];

export const PersonalSection = () => {
    const clerk = useClerk();
    const { isSignedIn, isLoaded } = useAuth();

    return (
        <SidebarGroup>
            <SidebarGroupLabel className="text-sm font-semibold px-3">You</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                tooltip={item.title}
                                asChild
                                isActive={false}
                                className="py-3"
                                onClick={(e) => {
                                    if (!isLoaded) return;   // 🔥 prevents hydration bug

                                    if (!isSignedIn && item.auth) {
                                        e.preventDefault();
                                        clerk.openSignIn(); // works safely now
                                    }
                                }}
                            >
                                <Link href={item.url} className="flex items-center gap-3">
                                    <item.icon className="h-5 w-5" />
                                    <span className="text-base font-medium">{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
};
