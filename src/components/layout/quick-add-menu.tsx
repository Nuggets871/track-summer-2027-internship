"use client";

import { Plus, Briefcase, Building2, User, ListChecks, StickyNote, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/store/ui-store";

export function QuickAddMenu() {
  const openQuickAdd = useUIStore((s) => s.openQuickAdd);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <Plus /> Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Créer rapidement</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => openQuickAdd("application")}>
          <Briefcase className="size-4" /> Candidature
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openQuickAdd("company")}>
          <Building2 className="size-4" /> Entreprise
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openQuickAdd("contact")}>
          <User className="size-4" /> Contact
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openQuickAdd("task")}>
          <ListChecks className="size-4" /> Tâche
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openQuickAdd("event")}>
          <CalendarPlus className="size-4" /> Événement
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openQuickAdd("note")}>
          <StickyNote className="size-4" /> Note
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
