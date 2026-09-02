"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Compass } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = [...NAV_ITEMS, SETTINGS_NAV_ITEM];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
        <Menu />
      </Button>
      <DialogContent size="sm" className="left-0 top-0 h-dvh max-h-dvh w-72 -translate-x-0 -translate-y-0 rounded-none">
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Compass className="size-4" />
          </div>
          <span className="text-sm font-semibold">Stage Copilot</span>
        </div>
        <nav className="overflow-y-auto px-2.5 py-3">
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium hover:bg-surface-hover",
                      active && "bg-primary-soft text-primary-soft-foreground",
                    )}
                  >
                    <item.icon className="size-[17px]" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
