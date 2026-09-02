import { getSmartAlerts } from "@/lib/data/notifications";
import { SearchTrigger } from "@/components/layout/search-trigger";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { QuickAddMenu } from "@/components/layout/quick-add-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { MobileNav } from "@/components/layout/mobile-nav";

export async function Topbar() {
  const alerts = await getSmartAlerts();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-sm md:px-6">
      <MobileNav />
      <div className="flex-1">
        <SearchTrigger />
      </div>
      <div className="flex items-center gap-1">
        <NotificationsBell alerts={alerts} />
        <ThemeToggle />
        <QuickAddMenu />
      </div>
    </header>
  );
}
