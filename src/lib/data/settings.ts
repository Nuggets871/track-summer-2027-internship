import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";
import { DEFAULT_CURRENCIES, DEFAULT_SOURCES } from "@/lib/constants";

export type AppSettings = {
  id: string;
  userName: string;
  userEmail: string;
  searchPeriodStart: Date | null;
  searchPeriodEnd: Date | null;
  preferredCountries: string[];
  preferredSectors: string[];
  preferredCurrencies: string[];
  sourceOptions: string[];
  theme: "light" | "dark" | "system";
  followUpRuleDays: number;
  staleOpportunityDays: number;
  deadlineWarningDays: number;
};

export async function getOrCreateSettingsRow() {
  return prisma.setting.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      sourceOptions: JSON.stringify(DEFAULT_SOURCES),
      preferredCurrencies: JSON.stringify(DEFAULT_CURRENCIES),
      preferredCountries: JSON.stringify([]),
      preferredSectors: JSON.stringify([]),
    },
  });
}

export async function getSettings(): Promise<AppSettings> {
  const row = await getOrCreateSettingsRow();
  return {
    id: row.id,
    userName: row.userName,
    userEmail: row.userEmail,
    searchPeriodStart: row.searchPeriodStart,
    searchPeriodEnd: row.searchPeriodEnd,
    preferredCountries: safeJsonParse(row.preferredCountries, [] as string[]),
    preferredSectors: safeJsonParse(row.preferredSectors, [] as string[]),
    preferredCurrencies: safeJsonParse(row.preferredCurrencies, DEFAULT_CURRENCIES),
    sourceOptions: safeJsonParse(row.sourceOptions, DEFAULT_SOURCES),
    theme: (row.theme as AppSettings["theme"]) ?? "system",
    followUpRuleDays: row.followUpRuleDays,
    staleOpportunityDays: row.staleOpportunityDays,
    deadlineWarningDays: row.deadlineWarningDays,
  };
}
