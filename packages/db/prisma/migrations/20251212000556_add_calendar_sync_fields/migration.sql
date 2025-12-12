-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'DISABLED');

-- AlterTable
ALTER TABLE "calendar" ADD COLUMN     "syncStatus" "SyncStatus",
ADD COLUMN     "lastSyncError" TEXT,
ADD COLUMN     "nextSyncAt" TIMESTAMP(3),
ADD COLUMN     "syncFrequency" INTEGER,
ADD COLUMN     "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastEtag" TEXT,
ADD COLUMN     "consecutiveFailures" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "calendar_sourceUrl_nextSyncAt_idx" ON "calendar"("sourceUrl", "nextSyncAt");

-- CreateIndex
CREATE INDEX "calendar_syncStatus_lastSyncedAt_idx" ON "calendar"("syncStatus", "lastSyncedAt");

