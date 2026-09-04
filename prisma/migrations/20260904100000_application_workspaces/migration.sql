-- Add explicit support for spontaneous applications and contextual AI workspaces.
ALTER TABLE "Application" ADD COLUMN "applicationType" TEXT NOT NULL DEFAULT 'ADVERTISED';
ALTER TABLE "Application" ADD COLUMN "outreachChannel" TEXT;
ALTER TABLE "Application" ADD COLUMN "recipientName" TEXT;
ALTER TABLE "Application" ADD COLUMN "recipientValue" TEXT;
ALTER TABLE "Application" ADD COLUMN "targetRole" TEXT;
ALTER TABLE "Application" ADD COLUMN "companyResearch" TEXT;
ALTER TABLE "Application" ADD COLUMN "messageDraft" TEXT;
ALTER TABLE "Application" ADD COLUMN "contactedAt" DATETIME;
ALTER TABLE "Application" ADD COLUMN "followUpAt" DATETIME;
ALTER TABLE "Application" ADD COLUMN "aiChatHistory" TEXT;

ALTER TABLE "CoverLetter" ADD COLUMN "chatHistory" TEXT;
ALTER TABLE "CoverLetter" ADD COLUMN "revisionHistory" TEXT;
