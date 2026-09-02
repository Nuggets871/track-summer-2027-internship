import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";
import {
  DEFAULT_CURRENCIES,
  DEFAULT_PRIORITY_WEIGHTS,
  DEFAULT_SOURCES,
  type PriorityLevel,
} from "@/lib/constants";
import type { PriorityWeights } from "@/lib/scoring";

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
  contactSilenceDays: number;
  priorityWeights: PriorityWeights;
  hasSeenDemoNotice: boolean;
};

export async function getOrCreateSettingsRow() {
  const existing = await prisma.setting.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return prisma.setting.create({
    data: {
      id: "singleton",
      sourceOptions: JSON.stringify(DEFAULT_SOURCES),
      preferredCurrencies: JSON.stringify(DEFAULT_CURRENCIES),
      preferredCountries: JSON.stringify([]),
      preferredSectors: JSON.stringify([]),
      priorityWeights: JSON.stringify(DEFAULT_PRIORITY_WEIGHTS),
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
    contactSilenceDays: row.contactSilenceDays,
    priorityWeights: safeJsonParse(row.priorityWeights, DEFAULT_PRIORITY_WEIGHTS),
    hasSeenDemoNotice: row.hasSeenDemoNotice,
  };
}

export type { PriorityLevel };
