-- DropIndex
DROP INDEX "Contact_companyId_idx";

-- DropIndex
DROP INDEX "Contact_lastName_idx";

-- DropIndex
DROP INDEX "Event_date_idx";

-- DropIndex
DROP INDEX "Interaction_contactId_idx";

-- DropIndex
DROP INDEX "Interaction_applicationId_idx";

-- DropIndex
DROP INDEX "Interview_scheduledAt_idx";

-- DropIndex
DROP INDEX "Interview_applicationId_idx";

-- DropIndex
DROP INDEX "InterviewPrep_applicationId_key";

-- DropIndex
DROP INDEX "JobListing_sourceId_sourceJobId_key";

-- DropIndex
DROP INDEX "JobListing_companyName_idx";

-- DropIndex
DROP INDEX "JobListing_duplicateOfId_idx";

-- DropIndex
DROP INDEX "JobListing_matchScore_idx";

-- DropIndex
DROP INDEX "JobListing_postedAt_idx";

-- DropIndex
DROP INDEX "JobListing_cityName_idx";

-- DropIndex
DROP INDEX "JobListing_countryName_idx";

-- DropIndex
DROP INDEX "JobListing_isInternship_idx";

-- DropIndex
DROP INDEX "JobListing_status_idx";

-- DropIndex
DROP INDEX "JobListing_linkedApplicationId_key";

-- DropIndex
DROP INDEX "JobSource_type_idx";

-- DropIndex
DROP INDEX "Offer_applicationId_key";

-- DropIndex
DROP INDEX "Tag_name_key";

-- DropIndex
DROP INDEX "Task_dueDate_idx";

-- DropIndex
DROP INDEX "Task_status_idx";

-- DropIndex
DROP INDEX "WeeklyReview_weekStart_key";

-- DropIndex
DROP INDEX "_ApplicationContacts_B_index";

-- DropIndex
DROP INDEX "_ApplicationContacts_AB_unique";

-- DropIndex
DROP INDEX "_ApplicationTags_B_index";

-- DropIndex
DROP INDEX "_ApplicationTags_AB_unique";

-- DropIndex
DROP INDEX "_CompanyTags_B_index";

-- DropIndex
DROP INDEX "_CompanyTags_AB_unique";

-- DropIndex
DROP INDEX "_ContactTags_B_index";

-- DropIndex
DROP INDEX "_ContactTags_AB_unique";

-- DropIndex
DROP INDEX "_DocumentTags_B_index";

-- DropIndex
DROP INDEX "_DocumentTags_AB_unique";

-- DropIndex
DROP INDEX "_NoteTags_B_index";

-- DropIndex
DROP INDEX "_NoteTags_AB_unique";

-- DropIndex
DROP INDEX "_ResearchTags_B_index";

-- DropIndex
DROP INDEX "_ResearchTags_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Contact";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Event";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Interaction";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Interview";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "InterviewPrep";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "JobListing";
PRAGMA foreign_keys=on;

-- DropTable
-- (FTS5 virtual table; dropping it also removes its _config/_content/_data/
-- _docsize/_idx shadow tables, so they are not dropped again explicitly.)
PRAGMA foreign_keys=off;
DROP TABLE "JobListingFts";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "JobSource";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "JobWatch";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Note";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Offer";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Question";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ResearchItem";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SavedSearch";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SavedView";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Tag";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Task";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "WeeklyReview";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_ApplicationContacts";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_ApplicationTags";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_CompanyTags";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_ContactTags";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_DocumentTags";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_NoteTags";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_ResearchTags";
PRAGMA foreign_keys=on;

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
    "department" TEXT,
    "jobUrl" TEXT,
    "source" TEXT,
    "discoveredAt" DATETIME,
    "appliedAt" DATETIME,
    "deadline" DATETIME,
    "potentialStartDate" DATETIME,
    "durationMonths" INTEGER,
    "salaryAmount" REAL,
    "salaryCurrency" TEXT DEFAULT 'EUR',
    "housingProvided" BOOLEAN,
    "visaRequired" BOOLEAN,
    "sponsorshipPossible" BOOLEAN,
    "languageRequired" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "interestScore" INTEGER NOT NULL DEFAULT 50,
    "estimatedProbability" INTEGER NOT NULL DEFAULT 50,
    "statusId" TEXT NOT NULL,
    "nextAction" TEXT,
    "nextActionDate" DATETIME,
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "lastInteractionAt" DATETIME,
    "notes" TEXT,
    "interviewPrepNotes" TEXT,
    "applicationType" TEXT NOT NULL DEFAULT 'ADVERTISED',
    "outreachChannel" TEXT,
    "recipientName" TEXT,
    "recipientValue" TEXT,
    "targetRole" TEXT,
    "companyResearch" TEXT,
    "messageDraft" TEXT,
    "contactedAt" DATETIME,
    "followUpAt" DATETIME,
    "aiChatHistory" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Application_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Application_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "PipelineStage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Application" ("aiChatHistory", "applicationType", "appliedAt", "cityId", "companyId", "companyResearch", "contactedAt", "countryId", "createdAt", "deadline", "department", "discoveredAt", "durationMonths", "estimatedProbability", "followUpAt", "followUpCount", "housingProvided", "id", "interestScore", "interviewPrepNotes", "isDemo", "jobUrl", "languageRequired", "lastInteractionAt", "messageDraft", "nextAction", "nextActionDate", "notes", "outreachChannel", "potentialStartDate", "priority", "recipientName", "recipientValue", "remotePossible", "salaryAmount", "salaryCurrency", "sector", "source", "sponsorshipPossible", "statusId", "targetRole", "title", "updatedAt", "visaRequired") SELECT "aiChatHistory", "applicationType", "appliedAt", "cityId", "companyId", "companyResearch", "contactedAt", "countryId", "createdAt", "deadline", "department", "discoveredAt", "durationMonths", "estimatedProbability", "followUpAt", "followUpCount", "housingProvided", "id", "interestScore", "interviewPrepNotes", "isDemo", "jobUrl", "languageRequired", "lastInteractionAt", "messageDraft", "nextAction", "nextActionDate", "notes", "outreachChannel", "potentialStartDate", "priority", "recipientName", "recipientValue", "remotePossible", "salaryAmount", "salaryCurrency", "sector", "source", "sponsorshipPossible", "statusId", "targetRole", "title", "updatedAt", "visaRequired" FROM "Application";
DROP TABLE "Application";
ALTER TABLE "new_Application" RENAME TO "Application";
CREATE INDEX "Application_companyId_idx" ON "Application"("companyId");
CREATE INDEX "Application_statusId_idx" ON "Application"("statusId");
CREATE INDEX "Application_deadline_idx" ON "Application"("deadline");
CREATE INDEX "Application_nextActionDate_idx" ON "Application"("nextActionDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

