"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type UIState = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // The single "+ Add" entry point: paste a job URL/description. There is
  // deliberately only one thing to create from anywhere in the app.
  addOpportunityOpen: boolean;
  openAddOpportunity: () => void;
  closeAddOpportunity: () => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      addOpportunityOpen: false,
      openAddOpportunity: () => set({ addOpportunityOpen: true }),
      closeAddOpportunity: () => set({ addOpportunityOpen: false }),
    }),
    { name: "internship-tracker-ui", partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) },
  ),
);
