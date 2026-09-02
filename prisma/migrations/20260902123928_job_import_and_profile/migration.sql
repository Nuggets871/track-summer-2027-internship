-- AlterTable
ALTER TABLE "Setting" ADD COLUMN "matchWeights" TEXT;

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "educationLevel" TEXT,
    "fieldOfStudy" TEXT,
    "graduationYear" INTEGER,
    "yearsOfExperience" INTEGER NOT NULL DEFAULT 0,
    "skills" TEXT,
    "languages" TEXT,
    "workAuthorization" TEXT,
    "availabilityNote" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JobAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "extractionMethod" TEXT NOT NULL,
    "rawExtractedText" TEXT,
    "responsibilities" TEXT,
    "qualifications" TEXT,
    "requiredSkills" TEXT,
    "requiredLanguages" TEXT,
    "requiredEducationLevel" TEXT,
    "requiredExperienceYears" INTEGER,
    "contractType" TEXT,
    "matchScore" INTEGER,
    "matchBreakdown" TEXT,
    "strengths" TEXT,
    "watchouts" TEXT,
    "missingSkills" TEXT,
    "recommendation" TEXT,
    "eligibilityStatus" TEXT,
    "eligibilityNotes" TEXT,
    "analyzedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileUpdatedAtSnapshot" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobAnalysis_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "JobAnalysis_applicationId_key" ON "JobAnalysis"("applicationId");
