import { prisma } from "@/lib/prisma";
import {
  TERMINAL_STAGE_KEYS,
  INTERVIEW_STAGE_KEYS,
  RESPONSE_STAGE_KEYS,
  SENT_OR_LATER_STAGE_KEYS,
} from "@/lib/constants";
import { format, startOfWeek, subWeeks } from "date-fns";

export async function getDashboardStats() {
  const applications = await prisma.application.findMany({
    include: { company: true, country: true, status: true },
  });

  const total = applications.length;
  const sent = applications.filter((a) => SENT_OR_LATER_STAGE_KEYS.includes(a.status.key) || a.status.key === "OFFER" || a.status.key === "REJECTED" || a.status.key === "GHOSTED").length;
  const toPrepare = applications.filter((a) => ["TO_EXPLORE", "TO_CONTACT", "TO_PREPARE", "READY"].includes(a.status.key)).length;
  const responses = applications.filter((a) => RESPONSE_STAGE_KEYS.includes(a.status.key)).length;
  const refused = applications.filter((a) => a.status.key === "REJECTED").length;
  const ghosted = applications.filter((a) => a.status.key === "GHOSTED").length;
  const interviews = applications.filter((a) => INTERVIEW_STAGE_KEYS.includes(a.status.key)).length;
  const offers = applications.filter((a) => a.status.key === "OFFER").length;
  const noResponse = applications.filter((a) => a.status.key === "SENT" || a.status.key === "FOLLOW_UP").length;
  const needsFollowUp = applications.filter((a) => a.status.key === "FOLLOW_UP").length;

  const appliedCount = applications.filter((a) => a.appliedAt).length;
  const responseRate = appliedCount > 0 ? Math.round((responses / appliedCount) * 100) : 0;
  const interviewRate = appliedCount > 0 ? Math.round((interviews + offers + refused) / appliedCount * 100) : 0;
  const conversionRate = appliedCount > 0 ? Math.round((offers / appliedCount) * 100) : 0;

  // Applications per week (last 10 weeks)
  const weeks: { week: string; count: number }[] = [];
  for (let i = 9; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const count = applications.filter((a) => a.appliedAt && a.appliedAt >= weekStart && a.appliedAt < weekEnd).length;
    weeks.push({ week: format(weekStart, "dd/MM"), count });
  }

  const byCountry = new Map<string, number>();
  applications.forEach((a) => a.country && byCountry.set(a.country.name, (byCountry.get(a.country.name) ?? 0) + 1));

  const bySector = new Map<string, number>();
  applications.forEach((a) => a.sector && bySector.set(a.sector, (bySector.get(a.sector) ?? 0) + 1));

  const byStatus = new Map<string, { count: number; color: string }>();
  applications.forEach((a) => {
    const existing = byStatus.get(a.status.label);
    byStatus.set(a.status.label, { count: (existing?.count ?? 0) + 1, color: a.status.color });
  });

  const bySource = new Map<string, number>();
  applications.forEach((a) => a.source && bySource.set(a.source, (bySource.get(a.source) ?? 0) + 1));

  const companyScores = new Map<string, { name: string; score: number; count: number }>();
  applications.forEach((a) => {
    const existing = companyScores.get(a.companyId);
    companyScores.set(a.companyId, {
      name: a.company.name,
      score: Math.max(existing?.score ?? 0, a.company.fitScore),
      count: (existing?.count ?? 0) + 1,
    });
  });
  const topCompanies = [...companyScores.values()].sort((a, b) => b.score - a.score).slice(0, 5);

  const deadlines = applications
    .filter((a) => a.deadline && !TERMINAL_STAGE_KEYS.includes(a.status.key))
    .sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime())
    .slice(0, 5);

  return {
    total,
    sent,
    toPrepare,
    responses,
    refused,
    ghosted,
    interviews,
    offers,
    noResponse,
    needsFollowUp,
    responseRate,
    interviewRate,
    conversionRate,
    weeklySeries: weeks,
    byCountry: [...byCountry.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    bySector: [...bySector.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    byStatus: [...byStatus.entries()].map(([name, v]) => ({ name, count: v.count, color: v.color })),
    bySource: [...bySource.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    topCompanies,
    upcomingDeadlines: deadlines,
  };
}

export async function getFunnelStats() {
  const applications = await prisma.application.findMany({ include: { status: true } });
  const discovered = applications.length;
  const applied = applications.filter((a) => a.appliedAt).length;
  const responded = applications.filter((a) => RESPONSE_STAGE_KEYS.includes(a.status.key)).length;
  const interviewed = applications.filter((a) => INTERVIEW_STAGE_KEYS.includes(a.status.key) || a.status.key === "OFFER").length;
  const finalRound = applications.filter((a) => a.status.key === "INTERVIEW_FINAL" || a.status.key === "OFFER").length;
  const offers = applications.filter((a) => a.status.key === "OFFER").length;

  return [
    { stage: "Opportunités identifiées", value: discovered },
    { stage: "Candidatures", value: applied },
    { stage: "Réponses", value: responded },
    { stage: "Entretiens", value: interviewed },
    { stage: "Final rounds", value: finalRound },
    { stage: "Offers", value: offers },
  ];
}

export async function getPerformanceBreakdowns() {
  const applications = await prisma.application.findMany({ include: { country: true, status: true } });

  function breakdown(keyFn: (a: (typeof applications)[number]) => string | null) {
    const map = new Map<string, { total: number; responses: number; offers: number }>();
    for (const a of applications) {
      const key = keyFn(a);
      if (!key) continue;
      const entry = map.get(key) ?? { total: 0, responses: 0, offers: 0 };
      entry.total += 1;
      if (RESPONSE_STAGE_KEYS.includes(a.status.key)) entry.responses += 1;
      if (a.status.key === "OFFER") entry.offers += 1;
      map.set(key, entry);
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v, responseRate: v.total > 0 ? Math.round((v.responses / v.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }

  return {
    byCountry: breakdown((a) => a.country?.name ?? null),
    bySector: breakdown((a) => a.sector),
    bySource: breakdown((a) => a.source),
    byNetworkingVsDirect: breakdown((a) => (a.source === "Networking" || a.source === "Recommandation" ? "Networking" : "Candidature classique")),
  };
}
