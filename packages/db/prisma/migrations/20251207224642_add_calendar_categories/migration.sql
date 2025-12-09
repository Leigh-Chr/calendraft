-- CreateTable
CREATE TABLE "calendar_category" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_category_calendarId_idx" ON "calendar_category"("calendarId");

-- CreateIndex
CREATE INDEX "calendar_category_category_idx" ON "calendar_category"("category");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_category_calendarId_category_key" ON "calendar_category"("calendarId", "category");

-- AddForeignKey
ALTER TABLE "calendar_category" ADD CONSTRAINT "calendar_category_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
