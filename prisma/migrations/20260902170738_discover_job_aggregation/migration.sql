-- CreateTable
CREATE TABLE "JobSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "lastSyncedAt" DATETIME,
    "lastSyncError" TEXT,
    "jobCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "sourceJobId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "description" TEXT,
    "rawText" TEXT,
    "cityName" TEXT,
    "countryName" TEXT,
    "remoteType" TEXT,
    "sector" TEXT,
    "contractType" TEXT,
    "isInternship" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" DATETIME,
    "expiresAt" DATETIME,
    "startDate" DATETIME,
    "durationMonths" INTEGER,
    "salaryAmount" REAL,
    "salaryCurrency" TEXT,
    "requiredEducationLevel" TEXT,
    "requiredExperienceYears" INTEGER,
    "requiredSkills" TEXT,
    "requiredLanguages" TEXT,
    "visaSponsorship" BOOLEAN,
    "tags" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "duplicateOfId" TEXT,
    "foundSourcesCount" INTEGER NOT NULL DEFAULT 1,
    "matchScore" INTEGER,
    "matchBreakdown" TEXT,
    "strengths" TEXT,
    "watchouts" TEXT,
    "missingSkills" TEXT,
    "recommendation" TEXT,
    "eligibilityStatus" TEXT,
    "eligibilityNotes" TEXT,
    "scoreProfileUpdatedAtSnapshot" DATETIME,
    "aiEnhanced" BOOLEAN NOT NULL DEFAULT false,
    "aiAnalyzedAt" DATETIME,
    "linkedApplicationId" TEXT,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobListing_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "JobSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobListing_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "JobListing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "query" TEXT,
    "filters" TEXT NOT NULL,
    "sort" TEXT NOT NULL DEFAULT 'match',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JobWatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT,
    "countryName" TEXT,
    "cityName" TEXT,
    "sector" TEXT,
    "lastNotifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "JobSource_type_idx" ON "JobSource"("type");

-- CreateIndex
CREATE UNIQUE INDEX "JobListing_linkedApplicationId_key" ON "JobListing"("linkedApplicationId");

-- CreateIndex
CREATE INDEX "JobListing_status_idx" ON "JobListing"("status");

-- CreateIndex
CREATE INDEX "JobListing_isInternship_idx" ON "JobListing"("isInternship");

-- CreateIndex
CREATE INDEX "JobListing_countryName_idx" ON "JobListing"("countryName");

-- CreateIndex
CREATE INDEX "JobListing_cityName_idx" ON "JobListing"("cityName");

-- CreateIndex
CREATE INDEX "JobListing_postedAt_idx" ON "JobListing"("postedAt");

-- CreateIndex
CREATE INDEX "JobListing_matchScore_idx" ON "JobListing"("matchScore");

-- CreateIndex
CREATE INDEX "JobListing_duplicateOfId_idx" ON "JobListing"("duplicateOfId");

-- CreateIndex
CREATE INDEX "JobListing_companyName_idx" ON "JobListing"("companyName");

-- CreateIndex
CREATE UNIQUE INDEX "JobListing_sourceId_sourceJobId_key" ON "JobListing"("sourceId", "sourceJobId");

-- Full-text search index for Discover. Not a Prisma model (SQLite virtual
-- tables aren't representable in schema.prisma) — kept in sync manually
-- from application code (src/lib/discover/search-index.ts) whenever a
-- JobListing is created, updated, or removed. `porter unicode61` gives real
-- (if basic) stemming — plurals and -ing/-ed endings match — without
-- pretending to offer full fuzzy/typo-tolerant search.
CREATE VIRTUAL TABLE "JobListingFts" USING fts5(
    id UNINDEXED,
    title,
    companyName,
    description,
    cityName,
    countryName,
    sector,
    skills,
    tags,
    tokenize = 'porter unicode61'
);
