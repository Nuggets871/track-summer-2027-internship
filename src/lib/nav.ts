import { Home, Telescope, Briefcase, Sparkles, User, Settings, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

// Deliberately short: Home → Discover → Opportunities → AI Assistant →
// Profile, plus Settings. Discover earns its slot because it's a real
// feature (real sources, real listings) — see src/lib/discover.
export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Discover", href: "/discover", icon: Telescope },
  { label: "Opportunities", href: "/opportunities", icon: Briefcase },
  { label: "AI Assistant", href: "/assistant", icon: Sparkles },
  { label: "Profile", href: "/profile", icon: User },
];

export const SETTINGS_NAV_ITEM: NavItem = { label: "Settings", href: "/settings", icon: Settings };
