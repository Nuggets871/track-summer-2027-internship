-- Pipeline stages are required reference data. They must exist on every
-- installation, independently from the optional demo-data seed.
INSERT OR IGNORE INTO "PipelineStage" ("id", "key", "label", "color", "order", "isSystem", "kind", "createdAt") VALUES
  ('system_pipeline_saved', 'SAVED', 'Sauvegardée', '#94a3b8', 0, true, 'APPLICATION', CURRENT_TIMESTAMP),
  ('system_pipeline_preparing', 'PREPARING', 'En préparation', '#818cf8', 1, true, 'APPLICATION', CURRENT_TIMESTAMP),
  ('system_pipeline_applied', 'APPLIED', 'Envoyée', '#38bdf8', 2, true, 'APPLICATION', CURRENT_TIMESTAMP),
  ('system_pipeline_interview', 'INTERVIEW', 'Entretien', '#4ade80', 3, true, 'APPLICATION', CURRENT_TIMESTAMP),
  ('system_pipeline_offer', 'OFFER', 'Offre', '#22c55e', 4, true, 'APPLICATION', CURRENT_TIMESTAMP),
  ('system_pipeline_rejected', 'REJECTED', 'Refusée', '#f87171', 5, true, 'APPLICATION', CURRENT_TIMESTAMP),
  ('system_pipeline_archived', 'ARCHIVED', 'Archivée', '#71717a', 6, true, 'APPLICATION', CURRENT_TIMESTAMP);
