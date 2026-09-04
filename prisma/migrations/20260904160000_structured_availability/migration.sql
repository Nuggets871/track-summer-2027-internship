ALTER TABLE "Profile" ADD COLUMN "availabilityStart" DATETIME;
ALTER TABLE "Profile" ADD COLUMN "availabilityEnd" DATETIME;
ALTER TABLE "Profile" ADD COLUMN "minDurationWeeks" INTEGER;
ALTER TABLE "Profile" ADD COLUMN "maxDurationWeeks" INTEGER;

ALTER TABLE "JobAnalysis" ADD COLUMN "requiredStartDate" DATETIME;
ALTER TABLE "JobAnalysis" ADD COLUMN "requiredEndDate" DATETIME;
ALTER TABLE "JobAnalysis" ADD COLUMN "requiredDurationWeeks" INTEGER;
