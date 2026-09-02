"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QuickAddKind =
  | "application"
  | "company"
  | "contact"
  | "task"
  | "note"
  | "event"
  | null;

type UIState = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  quickAdd: QuickAddKind;
  openQuickAdd: (kind: Exclude<QuickAddKind, null>) => void;
  closeQuickAdd: () => void;

  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      quickAdd: null,
      openQuickAdd: (kind) => set({ quickAdd: kind }),
      closeQuickAdd: () => set({ quickAdd: null }),

      focusMode: false,
      setFocusMode: (v) => set({ focusMode: v }),
    }),
    { name: "internship-tracker-ui", partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) },
  ),
);
