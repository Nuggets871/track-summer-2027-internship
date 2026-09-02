"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Compass } from "lucide-react";
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from "@/lib/nav";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "hidden md:flex h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-150",
          collapsed ? "w-[68px]" : "w-[212px]",
        )}
      >
        <div className={cn("flex h-14 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Compass className="size-4" />
          </div>
          {!collapsed && <span className="truncate text-sm font-semibold text-sidebar-foreground">Stage Copilot</span>}
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 pt-2">
          <ul className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const link = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-active/60",
                    active && "bg-sidebar-active text-foreground",
                    collapsed && "justify-center px-0 py-2",
                  )}
                >
                  <item.icon className="size-[17px] shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-2.5">
          <Link
            href={SETTINGS_NAV_ITEM.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-active/60",
              pathname.startsWith("/settings") && "bg-sidebar-active text-foreground",
              collapsed && "justify-center px-0 py-2",
            )}
          >
            <SETTINGS_NAV_ITEM.icon className="size-[17px] shrink-0" />
            {!collapsed && <span>{SETTINGS_NAV_ITEM.label}</span>}
          </Link>
          <button
            onClick={toggleSidebar}
            className={cn(
              "mt-1 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-active/60",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-[17px]" /> : <PanelLeftClose className="size-[17px]" />}
            {!collapsed && <span>Réduire</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
