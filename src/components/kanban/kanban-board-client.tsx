"use client";

import dynamic from "next/dynamic";

// dnd-kit generates drag-description ids from a module-level counter that
// isn't guaranteed to match between server and client renders, which causes
// a harmless but noisy hydration warning — rendering the board client-only
// sidesteps it entirely since drag-and-drop has no SSR value anyway.
export const KanbanBoardClient = dynamic(() => import("@/components/kanban/kanban-board").then((m) => m.KanbanBoard), {
  ssr: false,
});
