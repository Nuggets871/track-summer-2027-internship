"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Plane } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NAV_SECTIONS, SETTINGS_NAV_ITEM } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
        <Menu />
      </Button>
      <DialogContent size="sm" className="left-0 top-0 h-dvh max-h-dvh w-72 -translate-x-0 -translate-y-0 rounded-none">
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Plane className="size-4" />
          </div>
          <span className="text-sm font-semibold">Summer 2027 Track</span>
        </div>
        <nav className="overflow-y-auto px-2.5 py-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </p>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
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
            </div>
          ))}
          <Link
            href={SETTINGS_NAV_ITEM.href}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium hover:bg-surface-hover"
          >
            <SETTINGS_NAV_ITEM.icon className="size-[17px]" />
            {SETTINGS_NAV_ITEM.label}
          </Link>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
