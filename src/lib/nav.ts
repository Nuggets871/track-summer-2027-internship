import { Home, Briefcase, User, Settings, Calendar, Inbox, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

// Keep the primary navigation focused on the candidate's daily workflow.
export const NAV_ITEMS: NavItem[] = [
  { label: "Accueil", href: "/", icon: Home },
  { label: "Opportunités", href: "/opportunities", icon: Briefcase },
  { label: "Calendrier", href: "/calendar", icon: Calendar },
  { label: "Pistes", href: "/inbox", icon: Inbox },
  { label: "Profil", href: "/profile", icon: User },
];

export const SETTINGS_NAV_ITEM: NavItem = { label: "Paramètres", href: "/settings", icon: Settings };
