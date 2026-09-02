"use client";

import { Search } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { Kbd } from "@/components/ui/kbd";

export function SearchTrigger() {
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  return (
    <button
      onClick={() => setOpen(true)}
      className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-subtle-foreground transition-colors hover:border-border-strong hover:bg-surface-hover"
    >
      <Search className="size-4" />
      <span className="flex-1 text-left">Rechercher...</span>
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </button>
  );
}
