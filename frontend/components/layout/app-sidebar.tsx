"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/paceui/motion/sidebar";
import { Logo } from "./logo";
import { NAV, isActive } from "./nav-items";

/**
 * Primary navigation on PaceUI's motion sidebar: persistent, collapsible rail from 768px up and a sheet below it.
 * The routes, labels, "Preview" badge and active-page semantics (`aria-current`) are the same as before.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const close = () => setOpenMobile(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-[4.5rem] justify-center px-5 group-data-[collapsible=icon]:px-0">
        <Link href="/" aria-label="FINIX home" className="flex rounded-lg group-data-[collapsible=icon]:justify-center" onClick={close}><Logo collapsed={collapsed} /></Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label="Primary">
              <SidebarMenu>
                {NAV.map(item => {
                  const active = isActive(pathname, item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active} size="lg" title={collapsed ? item.label : undefined}
                        render={<Link href={item.href} aria-current={active ? "page" : undefined} aria-label={collapsed ? item.label : undefined} onClick={close} />}
                      >
                        <item.icon aria-hidden />
                        {!collapsed && <span>{item.label}</span>}
                        {!collapsed && item.preview && <span className="ml-auto rounded-full border border-current/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Preview</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!isMobile && (
        <SidebarFooter className="border-t">
          <SidebarMenuButton onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} showHighlight={false}>
            {collapsed ? <PanelLeftOpen aria-hidden /> : <><PanelLeftClose aria-hidden /><span>Collapse</span></>}
          </SidebarMenuButton>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
