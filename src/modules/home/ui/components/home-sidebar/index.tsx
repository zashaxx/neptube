"use client";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar"
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MainSection } from "./main-section"
import { Separator } from "@/components/ui/separator"
import { PersonalSection } from "./personal-section"


export const HomeSidebar = ()=>{
    // Get current user info (including role)
    const { data: currentUser } = trpc.users.me.useQuery(undefined, { staleTime: 60_000 });
    // Helper: treat admins as premium
    const isAdmin = currentUser?.role === "admin";
    // Helper: treat as premium if admin or premium tier
    const isPremium = isAdmin || currentUser?.subscriptionTier === "premium" || currentUser?.subscriptionTier === "vip";
    return (
        <Sidebar className="pt-14 z-40 border-none" collapsible="icon">
            <SidebarContent className="bg-background/70 backdrop-blur-xl flex flex-col h-full">
                <div className="flex-1 min-h-0 flex flex-col">
                    <MainSection/>
                    <Separator/>
                    <PersonalSection/>
                </div>
                <div className="p-4 mt-auto">
                    <Link href="/premium">
                        <Button className="w-full gap-1.5 rounded-lg bg-gradient-to-r from-yellow-400 via-pink-500 to-red-500 text-white font-semibold shadow-md hover:from-yellow-500 hover:to-pink-600 transition-colors">
                            <span role="img" aria-label="star">⭐</span>
                            Go Premium
                        </Button>
                    </Link>
                </div>
            </SidebarContent>
        </Sidebar>
    )
}