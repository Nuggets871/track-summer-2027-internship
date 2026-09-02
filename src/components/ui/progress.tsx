import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  barClassName,
  color,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  color?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-muted", className)}>
      <div
        className={cn("h-full rounded-full bg-primary transition-all duration-300", barClassName)}
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
