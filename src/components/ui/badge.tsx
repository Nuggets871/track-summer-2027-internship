import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border",
  {
    variants: {
      variant: {
        default: "bg-surface-muted text-foreground border-border",
        primary: "bg-primary-soft text-primary-soft-foreground border-transparent",
        success: "bg-success-soft text-success-foreground border-transparent",
        warning: "bg-warning-soft text-warning-foreground border-transparent",
        danger: "bg-danger-soft text-danger-foreground border-transparent",
        outline: "bg-transparent text-muted-foreground border-border",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dotColor?: string;
}

export function Badge({ className, variant, dotColor, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dotColor && <span className="size-1.5 rounded-full" style={{ backgroundColor: dotColor }} />}
      {children}
    </span>
  );
}
