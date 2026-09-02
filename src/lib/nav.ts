import { Home, Briefcase, Sparkles, User, Settings, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

// Deliberately short: the whole app is Home → Opportunities → AI Assistant →
// Profile, plus Settings. Everything else lives inside these four pages.
export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Opportunities", href: "/opportunities", icon: Briefcase },
  { label: "AI Assistant", href: "/assistant", icon: Sparkles },
  { label: "Profile", href: "/profile", icon: User },
];

export const SETTINGS_NAV_ITEM: NavItem = { label: "Settings", href: "/settings", icon: Settings };
