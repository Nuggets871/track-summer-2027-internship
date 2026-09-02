"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function RhfSelect<T extends FieldValues>({
  control,
  name,
  options,
  placeholder,
  allowEmpty,
  emptyLabel = "—",
}: {
  control: Control<T>;
  name: Path<T>;
  options: { value: string; label: string }[];
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          value={field.value ?? ""}
          onValueChange={(v) => field.onChange(v === "__empty__" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {allowEmpty && <SelectItem value="__empty__">{emptyLabel}</SelectItem>}
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}
