// Safe date parsing for provider responses. A source occasionally sends a
// date `new Date()` can't parse (an unexpected format, or garbage), which
// yields an Invalid Date — and Prisma rejects an Invalid Date outright when
// writing it to a DateTime column, crashing the whole sync. Never guess a
// fallback either: an unparsable date just becomes null, exactly like a
// missing one — never invented.
export function parseDateSafe(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
