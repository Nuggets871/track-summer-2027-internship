-- Data backfill for existing "Pistes" rows.
--
-- Before the ADVERTISED | SPONTANEOUS split, ChatGPT staged spontaneous
-- targets through `addInternships` too: they carry a URL (a careers /
-- open-application page), a title prefixed with "Candidature spontanée —" or
-- "Open Application —", and a source containing "Candidature spontanée".
-- The schema migration defaulted every existing row to ADVERTISED, so this
-- reclassifies the real spontaneous ones and moves their fields to the right
-- place. It is a no-op on an empty database.

UPDATE "Lead"
SET "kind" = 'SPONTANEOUS'
WHERE lower("source") LIKE '%spontan%'
   OR "role" LIKE 'Open Application%';

-- Keep only the targeted domain as the role, dropping the
-- "Candidature spontanée —" / "Open Application —" prefix.
UPDATE "Lead"
SET "role" = trim(substr("role", instr("role", '—') + 1))
WHERE "kind" = 'SPONTANEOUS' AND instr("role", '—') > 0;

-- The research angle / proposal was stored in `description`; for a
-- spontaneous target it belongs to `note` (description is for a published
-- offer's job description).
UPDATE "Lead"
SET "note" = COALESCE(NULLIF(trim("note"), ''), "description"),
    "description" = NULL
WHERE "kind" = 'SPONTANEOUS' AND "description" IS NOT NULL;

-- "Candidature spontanée — planification; contact RH: <name>" carries a
-- contact name worth keeping.
UPDATE "Lead"
SET "contactName" = trim(substr("source", instr("source", 'contact RH:') + length('contact RH:')))
WHERE "kind" = 'SPONTANEOUS' AND instr("source", 'contact RH:') > 0;

-- These targets point at official careers / open-application pages, so the
-- default outreach channel is the company website.
UPDATE "Lead"
SET "channel" = 'WEBSITE'
WHERE "kind" = 'SPONTANEOUS' AND "channel" IS NULL;
