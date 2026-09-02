import {
  Sun,
  LayoutDashboard,
  BarChart3,
  CalendarCheck2,
  KanbanSquare,
  Table2,
  Star,
  Scale,
  Building2,
  Users,
  Share2,
  ListChecks,
  Calendar,
  FolderOpen,
  FileText,
  MessagesSquare,
  Search,
  Globe2,
  Map,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Pilotage",
    items: [
      { label: "Today", href: "/today", icon: Sun },
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Weekly Review", href: "/weekly-review", icon: CalendarCheck2 },
    ],
  },
  {
    title: "Candidatures",
    items: [
      { label: "Tracker", href: "/applications", icon: Table2 },
      { label: "Kanban", href: "/kanban", icon: KanbanSquare },
      { label: "Wishlist", href: "/wishlist", icon: Star },
      { label: "Comparateur d'offres", href: "/offers", icon: Scale },
    ],
  },
  {
    title: "Relations",
    items: [
      { label: "Entreprises", href: "/companies", icon: Building2 },
      { label: "Contacts", href: "/contacts", icon: Users },
      { label: "Networking", href: "/networking", icon: Share2 },
    ],
  },
  {
    title: "Organisation",
    items: [
      { label: "Tâches", href: "/tasks", icon: ListChecks },
      { label: "Calendrier", href: "/calendar", icon: Calendar },
      { label: "Documents", href: "/documents", icon: FolderOpen },
      { label: "Lettres de motivation", href: "/cover-letters", icon: FileText },
      { label: "Entretiens", href: "/interviews", icon: MessagesSquare },
    ],
  },
  {
    title: "Exploration",
    items: [
      { label: "Recherche", href: "/research", icon: Search },
      { label: "Pays", href: "/countries", icon: Globe2 },
      { label: "Carte", href: "/map", icon: Map },
    ],
  },
];

export const SETTINGS_NAV_ITEM: NavItem = { label: "Paramètres", href: "/settings", icon: Settings };
