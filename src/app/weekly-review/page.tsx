import { prisma } from "@/lib/prisma";
import { WeeklyReviewContent } from "@/components/weekly-review/weekly-review-content";

export const metadata = { title: "Weekly Review" };

export default async function WeeklyReviewPage() {
  const reviews = await prisma.weeklyReview.findMany({ orderBy: { weekStart: "desc" } });
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Weekly Review</h1>
        <p className="text-sm text-muted-foreground">Faites le point chaque semaine — les chiffres sont calculés automatiquement.</p>
      </div>
      <WeeklyReviewContent reviews={reviews} />
    </div>
  );
}
