-- AlterTable
ALTER TABLE "Application" ADD COLUMN "interviewPrepNotes" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "cvDocumentId" TEXT;
ALTER TABLE "Profile" ADD COLUMN "cvParsedAt" DATETIME;
ALTER TABLE "Profile" ADD COLUMN "cvRawText" TEXT;
ALTER TABLE "Profile" ADD COLUMN "email" TEXT;
ALTER TABLE "Profile" ADD COLUMN "experiences" TEXT;
ALTER TABLE "Profile" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Profile" ADD COLUMN "lastName" TEXT;
ALTER TABLE "Profile" ADD COLUMN "phone" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Setting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "userName" TEXT NOT NULL DEFAULT '',
    "userEmail" TEXT NOT NULL DEFAULT '',
    "searchPeriodStart" DATETIME,
    "searchPeriodEnd" DATETIME,
    "preferredCountries" TEXT,
    "preferredSectors" TEXT,
    "preferredCurrencies" TEXT,
    "sourceOptions" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "followUpRuleDays" INTEGER NOT NULL DEFAULT 7,
    "staleOpportunityDays" INTEGER NOT NULL DEFAULT 14,
    "deadlineWarningDays" INTEGER NOT NULL DEFAULT 3,
    "contactSilenceDays" INTEGER NOT NULL DEFAULT 20,
    "priorityWeights" TEXT,
    "matchWeights" TEXT,
    "hasSeenDemoNotice" BOOLEAN NOT NULL DEFAULT false,
    "aiProvider" TEXT NOT NULL DEFAULT 'deepseek',
    "deepseekApiKey" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Setting" ("contactSilenceDays", "deadlineWarningDays", "followUpRuleDays", "hasSeenDemoNotice", "id", "matchWeights", "preferredCountries", "preferredCurrencies", "preferredSectors", "priorityWeights", "searchPeriodEnd", "searchPeriodStart", "sourceOptions", "staleOpportunityDays", "theme", "updatedAt", "userEmail", "userName") SELECT "contactSilenceDays", "deadlineWarningDays", "followUpRuleDays", "hasSeenDemoNotice", "id", "matchWeights", "preferredCountries", "preferredCurrencies", "preferredSectors", "priorityWeights", "searchPeriodEnd", "searchPeriodStart", "sourceOptions", "staleOpportunityDays", "theme", "updatedAt", "userEmail", "userName" FROM "Setting";
DROP TABLE "Setting";
ALTER TABLE "new_Setting" RENAME TO "Setting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
