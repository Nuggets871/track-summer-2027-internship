"use client";

import { useEffect } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Briefcase, Search as SearchIcon, Plus } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from "@/lib/nav";
import type { SearchItem } from "@/lib/data/search-index";
import "@/components/layout/command-palette.css";

export function CommandPalette({ items }: { items: SearchItem[] }) {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const openAddOpportunity = useUIStore((s) => s.openAddOpportunity);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Recherche globale"
      className="fixed left-1/2 top-[15%] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-surface shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-border px-3">
        <SearchIcon className="size-4 text-muted-foreground" />
        <Command.Input
          placeholder="Rechercher une opportunité..."
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
        />
      </div>
      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        <Command.Empty className="py-8 text-center text-sm text-muted-foreground">Aucun résultat.</Command.Empty>

        <Command.Group heading="Action rapide" className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
          <Command.Item
            onSelect={() => {
              setOpen(false);
              openAddOpportunity();
            }}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm data-[selected=true]:bg-surface-hover"
          >
            <Plus className="size-4 text-muted-foreground" />
            Ajouter une opportunité (coller un lien)
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Navigation" className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
          {NAV_ITEMS.concat(SETTINGS_NAV_ITEM).map((item) => (
            <Command.Item
              key={item.href}
              onSelect={() => go(item.href)}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm data-[selected=true]:bg-surface-hover"
            >
              <item.icon className="size-4 text-muted-foreground" />
              {item.label}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Opportunités" className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
          {items.map((item) => (
            <Command.Item
              key={item.id}
              value={`${item.label} ${item.sublabel ?? ""}`}
              onSelect={() => go(item.href)}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm data-[selected=true]:bg-surface-hover"
            >
              <Briefcase className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.sublabel && <span className="shrink-0 text-xs text-subtle-foreground">{item.sublabel}</span>}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
