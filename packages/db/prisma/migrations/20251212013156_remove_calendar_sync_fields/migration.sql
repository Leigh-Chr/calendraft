-- Drop indexes related to sync
DROP INDEX IF EXISTS "calendar_sourceUrl_nextSyncAt_idx";
DROP INDEX IF EXISTS "calendar_syncStatus_lastSyncedAt_idx";

-- Remove sync-related columns from calendar table
ALTER TABLE "calendar" DROP COLUMN IF EXISTS "syncStatus";
ALTER TABLE "calendar" DROP COLUMN IF EXISTS "lastSyncError";
ALTER TABLE "calendar" DROP COLUMN IF EXISTS "nextSyncAt";
ALTER TABLE "calendar" DROP COLUMN IF EXISTS "syncFrequency";
ALTER TABLE "calendar" DROP COLUMN IF EXISTS "syncEnabled";
ALTER TABLE "calendar" DROP COLUMN IF EXISTS "lastEtag";
ALTER TABLE "calendar" DROP COLUMN IF EXISTS "consecutiveFailures";

-- Drop SyncStatus enum (only if no other tables use it)
DROP TYPE IF EXISTS "SyncStatus";

