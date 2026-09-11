-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT,
    "company" TEXT,
    "role" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "countryId" TEXT,
    "cityId" TEXT,
    "remotePossible" BOOLEAN NOT NULL DEFAULT false,
    "sector" TEXT,
    "jobUrl" TEXT,
    "source" TEXT,
    "discoveredAt" DATETIME,
    "appliedAt" DATETIME,
    "deadline" DATETIME,
    "potentialStartDate" DATETIME,
    "durationMonths" INTEGER,
    "salaryAmount" REAL,
    "salaryCurrency" TEXT DEFAULT 'EUR',
    "statusId" TEXT NOT NULL,
    "nextAction" TEXT,
    "nextActionDate" DATETIME,
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "lastInteractionAt" DATETIME,
    "notes" TEXT,
    "interviewPrepNotes" TEXT,
    "interviewChecklist" TEXT,
    "applicationType" TEXT NOT NULL DEFAULT 'ADVERTISED',
    "outreachChannel" TEXT,
    "recipientName" TEXT,
    "recipientValue" TEXT,
    "targetRole" TEXT,
    "companyResearch" TEXT,
    "messageDraft" TEXT,
    "followUpAt" DATETIME,
    "aiChatHistory" TEXT,
    "deletedAt" DATETIME,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Application_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Application_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "PipelineStage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Application" ("aiChatHistory", "applicationType", "appliedAt", "cityId", "companyId", "companyResearch", "countryId", "createdAt", "deadline", "discoveredAt", "durationMonths", "followUpAt", "followUpCount", "id", "interviewPrepNotes", "isDemo", "jobUrl", "lastInteractionAt", "messageDraft", "nextAction", "nextActionDate", "notes", "outreachChannel", "potentialStartDate", "recipientName", "recipientValue", "remotePossible", "salaryAmount", "salaryCurrency", "sector", "source", "statusId", "targetRole", "title", "updatedAt") SELECT "aiChatHistory", "applicationType", "appliedAt", "cityId", "companyId", "companyResearch", "countryId", "createdAt", "deadline", "discoveredAt", "durationMonths", "followUpAt", "followUpCount", "id", "interviewPrepNotes", "isDemo", "jobUrl", "lastInteractionAt", "messageDraft", "nextAction", "nextActionDate", "notes", "outreachChannel", "potentialStartDate", "recipientName", "recipientValue", "remotePossible", "salaryAmount", "salaryCurrency", "sector", "source", "statusId", "targetRole", "title", "updatedAt" FROM "Application";
DROP TABLE "Application";
ALTER TABLE "new_Application" RENAME TO "Application";
CREATE INDEX "Application_companyId_idx" ON "Application"("companyId");
CREATE INDEX "Application_statusId_idx" ON "Application"("statusId");
CREATE INDEX "Application_deadline_idx" ON "Application"("deadline");
CREATE INDEX "Application_nextActionDate_idx" ON "Application"("nextActionDate");
CREATE INDEX "Application_deletedAt_idx" ON "Application"("deletedAt");
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "countryId" TEXT,
    "sector" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Company_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Company" ("countryId", "createdAt", "id", "isDemo", "name", "sector", "updatedAt") SELECT "countryId", "createdAt", "id", "isDemo", "name", "sector", "updatedAt" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE INDEX "Company_name_idx" ON "Company"("name");
CREATE TABLE "new_Country" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Country" ("createdAt", "id", "name", "updatedAt") SELECT "createdAt", "id", "name", "updatedAt" FROM "Country";
DROP TABLE "Country";
ALTER TABLE "new_Country" RENAME TO "Country";
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");
CREATE INDEX "Country_name_idx" ON "Country"("name");
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
    "aiProvider" TEXT NOT NULL DEFAULT 'deepseek',
    "deepseekApiKey" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Setting" ("aiProvider", "deadlineWarningDays", "deepseekApiKey", "followUpRuleDays", "id", "preferredCountries", "preferredCurrencies", "preferredSectors", "searchPeriodEnd", "searchPeriodStart", "sourceOptions", "staleOpportunityDays", "theme", "updatedAt", "userEmail", "userName") SELECT "aiProvider", "deadlineWarningDays", "deepseekApiKey", "followUpRuleDays", "id", "preferredCountries", "preferredCurrencies", "preferredSectors", "searchPeriodEnd", "searchPeriodStart", "sourceOptions", "staleOpportunityDays", "theme", "updatedAt", "userEmail", "userName" FROM "Setting";
DROP TABLE "Setting";
ALTER TABLE "new_Setting" RENAME TO "Setting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Activity_applicationId_idx" ON "Activity"("applicationId");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

