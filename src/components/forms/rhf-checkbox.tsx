"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";

export function RhfCheckbox<T extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
          {label}
        </label>
      )}
    />
  );
}

export function RhfRange<T extends FieldValues>({
  control,
  name,
  min = 0,
  max = 100,
  step = 5,
}: {
  control: Control<T>;
  name: Path<T>;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={field.value ?? min}
            onChange={(e) => field.onChange(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-primary"
          />
          <span className="w-9 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
            {field.value ?? min}
          </span>
        </div>
      )}
    />
  );
}
