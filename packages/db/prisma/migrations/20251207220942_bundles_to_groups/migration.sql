-- AlterTable
ALTER TABLE "calendar_share_bundle" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "calendar_group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_group_member" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "calendar_group_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_group_userId_idx" ON "calendar_group"("userId");

-- CreateIndex
CREATE INDEX "calendar_group_member_groupId_idx" ON "calendar_group_member"("groupId");

-- CreateIndex
CREATE INDEX "calendar_group_member_calendarId_idx" ON "calendar_group_member"("calendarId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_group_member_groupId_calendarId_key" ON "calendar_group_member"("groupId", "calendarId");

-- CreateIndex
CREATE INDEX "calendar_share_bundle_groupId_idx" ON "calendar_share_bundle"("groupId");

-- AddForeignKey
ALTER TABLE "calendar_group_member" ADD CONSTRAINT "calendar_group_member_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "calendar_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_share_bundle" ADD CONSTRAINT "calendar_share_bundle_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "calendar_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
