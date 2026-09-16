-- CreateTable
CREATE TABLE "DiscoveredJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canonicalUrl" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceJobId" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "remoteType" TEXT,
    "salaryAmount" REAL,
    "salaryCurrency" TEXT,
    "employmentType" TEXT,
    "postedAt" DATETIME,
    "description" TEXT,
    "matchScore" INTEGER,
    "matchLabel" TEXT,
    "eligibilityStatus" TEXT,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SearchQueryCache" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProviderUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredJob_canonicalUrl_key" ON "DiscoveredJob"("canonicalUrl");

-- CreateIndex
CREATE INDEX "DiscoveredJob_providerId_idx" ON "DiscoveredJob"("providerId");

-- CreateIndex
CREATE INDEX "DiscoveredJob_firstSeenAt_idx" ON "DiscoveredJob"("firstSeenAt");

-- CreateIndex
CREATE INDEX "DiscoveredJob_matchScore_idx" ON "DiscoveredJob"("matchScore");

-- CreateIndex
CREATE INDEX "DiscoveredJob_dismissed_idx" ON "DiscoveredJob"("dismissed");

-- CreateIndex
CREATE INDEX "SearchQueryCache_providerId_idx" ON "SearchQueryCache"("providerId");

-- CreateIndex
CREATE INDEX "SearchQueryCache_fetchedAt_idx" ON "SearchQueryCache"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderUsage_providerId_periodKey_key" ON "ProviderUsage"("providerId", "periodKey");

