import { Sidebar, SidebarContent } from "@/components/ui/sidebar"
import { MainSection } from "./main-section"
import { Separator } from "@/components/ui/separator"
import { PersonalSection } from "./personal-section"


export const HomeSidebar = ()=>{
    return (
        <Sidebar className="pt-14 z-40 border-none" collapsible="icon">
                <SidebarContent className="bg-background/70 backdrop-blur-xl" >
                    <MainSection/>
                    <Separator/>
                    <PersonalSection/>
                </SidebarContent>
        </Sidebar>
    )
}