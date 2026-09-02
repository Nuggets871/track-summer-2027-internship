"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/ui-store";

export function QuickAddMenu() {
  const openAddOpportunity = useUIStore((s) => s.openAddOpportunity);

  return (
    <Button size="sm" onClick={openAddOpportunity}>
      <Plus /> Add
    </Button>
  );
}
