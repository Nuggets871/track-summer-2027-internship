-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'ADVERTISED',
    "url" TEXT,
    "company" TEXT,
    "role" TEXT,
    "note" TEXT,
    "country" TEXT,
    "city" TEXT,
    "description" TEXT,
    "channel" TEXT,
    "contactName" TEXT,
    "contactValue" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Lead" ("city", "company", "country", "createdAt", "description", "id", "note", "role", "source", "status", "updatedAt", "url") SELECT "city", "company", "country", "createdAt", "description", "id", "note", "role", "source", "status", "updatedAt", "url" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_kind_idx" ON "Lead"("kind");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
