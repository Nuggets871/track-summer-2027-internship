"use client";

import { FileText, MoreHorizontal, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/store/ui-store";

export function QuickAddMenu() {
  const openAddOpportunity = useUIStore((s) => s.openAddOpportunity);

  return (
    <div className="flex items-center">
      <Button size="sm" className="rounded-r-none" onClick={() => openAddOpportunity("link")}>
        <Plus /> Ajouter
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="default" className="rounded-l-none border-l border-primary-foreground/20 px-2" aria-label="Autres façons d'ajouter">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => openAddOpportunity("description")}>
            <FileText className="size-4" /> Coller une description
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openAddOpportunity("spontaneous")}>
            <Send className="size-4" /> Candidature spontanée
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
