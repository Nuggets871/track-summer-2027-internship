"use client";

import Link from "next/link";
import { Bell, AlertTriangle, Info, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate } from "@/lib/utils";
import type { SmartAlert } from "@/lib/data/notifications";

const SEVERITY_STYLES: Record<SmartAlert["severity"], string> = {
  critical: "text-danger",
  warning: "text-warning",
  info: "text-muted-foreground",
};

const SEVERITY_ICON: Record<SmartAlert["severity"], typeof AlertTriangle> = {
  critical: AlertTriangle,
  warning: Clock,
  info: Info,
};

export function NotificationsBell({ alerts }: { alerts: SmartAlert[] }) {
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell />
          {alerts.length > 0 && (
            <span
              className={cn(
                "absolute right-1 top-1 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-white",
                criticalCount > 0 ? "bg-danger" : "bg-warning",
              )}
            >
              {alerts.length > 9 ? "9+" : alerts.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <DropdownMenuLabel className="px-3 py-2.5 text-sm">
          Alertes {alerts.length > 0 && <span className="text-muted-foreground">({alerts.length})</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-96 overflow-y-auto py-1">
          {alerts.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Rien à signaler. 🎉</p>
          )}
          {alerts.slice(0, 30).map((alert) => {
            const Icon = SEVERITY_ICON[alert.severity];
            return (
              <Link
                key={alert.id}
                href={alert.href}
                className="flex items-start gap-2.5 px-3 py-2 text-sm hover:bg-surface-hover"
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", SEVERITY_STYLES[alert.severity])} />
                <span className="flex-1 text-foreground">{alert.message}</span>
                <span className="shrink-0 text-xs text-subtle-foreground">{formatDate(alert.date)}</span>
              </Link>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
