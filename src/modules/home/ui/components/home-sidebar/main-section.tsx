"use client"

import { 
    SidebarGroup, 
    SidebarGroupContent, 
    SidebarMenu, 
    SidebarMenuButton , 
    SidebarMenuItem 
} from "@/components/ui/sidebar";
import { TrendingUp, Home, Video } from "lucide-react"
import Link from "next/link";

import { useAuth, useClerk } from "@clerk/nextjs";

const items = [
    { title:"Home", url:"/", icon:Home },
    { title:"Subscriptions", url:"/feed/subscriptions", icon:Video, auth:true },
    { title:"Trending", url:"/feed/trending", icon:TrendingUp },
];

export const MainSection = () => {

    const clerk = useClerk();
    const { isSignedIn, isLoaded } = useAuth();   // 🔥 add isLoaded

    return (
        <SidebarGroup>
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
                                    if (!isLoaded) return;   // 🔥 prevents hydration glitch

                                    if (!isSignedIn && item.auth) {
                                        e.preventDefault();
                                        return clerk.openSignIn();
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
    )
}
