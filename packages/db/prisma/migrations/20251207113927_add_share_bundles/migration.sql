-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('CONFIRMED', 'TENTATIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventClass" AS ENUM ('PUBLIC', 'PRIVATE', 'CONFIDENTIAL');

-- CreateEnum
CREATE TYPE "EventTransparency" AS ENUM ('OPAQUE', 'TRANSPARENT');

-- CreateEnum
CREATE TYPE "AttendeeRole" AS ENUM ('CHAIR', 'REQ_PARTICIPANT', 'OPT_PARTICIPANT', 'NON_PARTICIPANT');

-- CreateEnum
CREATE TYPE "AttendeeStatus" AS ENUM ('NEEDS_ACTION', 'ACCEPTED', 'DECLINED', 'TENTATIVE', 'DELEGATED');

-- CreateEnum
CREATE TYPE "AlarmAction" AS ENUM ('DISPLAY', 'EMAIL', 'AUDIO');

-- CreateEnum
CREATE TYPE "RecurrenceDateType" AS ENUM ('RDATE', 'EXDATE');

-- CreateTable
CREATE TABLE "user" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "session" (
    "_id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "account" (
    "_id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "verification" (
    "_id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "calendar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "userId" TEXT,
    "sourceUrl" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "status" "EventStatus",
    "priority" INTEGER,
    "url" TEXT,
    "class" "EventClass",
    "comment" TEXT,
    "contact" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "transp" "EventTransparency",
    "rrule" TEXT,
    "geoLatitude" DOUBLE PRECISION,
    "geoLongitude" DOUBLE PRECISION,
    "organizerName" TEXT,
    "organizerEmail" TEXT,
    "uid" TEXT,
    "dtstamp" TIMESTAMP(3),
    "created" TIMESTAMP(3),
    "lastModified" TIMESTAMP(3),
    "recurrenceId" TEXT,
    "relatedTo" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendee" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "role" "AttendeeRole",
    "status" "AttendeeStatus",
    "rsvp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_attendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_alarm" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "action" "AlarmAction" NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "duration" TEXT,
    "repeat" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_alarm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_category" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_resource" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurrence_date" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "RecurrenceDateType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurrence_date_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_share_link" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_share_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_share_bundle" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "removeDuplicates" BOOLEAN NOT NULL DEFAULT false,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_share_bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_bundle_calendar" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "share_bundle_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "session_expiresAt_idx" ON "session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "account_accountId_providerId_idx" ON "account"("accountId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "account_userId_providerId_key" ON "account"("userId", "providerId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "verification_expiresAt_idx" ON "verification"("expiresAt");

-- CreateIndex
CREATE INDEX "calendar_userId_idx" ON "calendar"("userId");

-- CreateIndex
CREATE INDEX "event_calendarId_idx" ON "event"("calendarId");

-- CreateIndex
CREATE INDEX "event_startDate_idx" ON "event"("startDate");

-- CreateIndex
CREATE INDEX "event_endDate_idx" ON "event"("endDate");

-- CreateIndex
CREATE INDEX "event_uid_idx" ON "event"("uid");

-- CreateIndex
CREATE INDEX "event_status_idx" ON "event"("status");

-- CreateIndex
CREATE UNIQUE INDEX "event_calendarId_uid_key" ON "event"("calendarId", "uid");

-- CreateIndex
CREATE INDEX "event_attendee_eventId_idx" ON "event_attendee"("eventId");

-- CreateIndex
CREATE INDEX "event_attendee_email_idx" ON "event_attendee"("email");

-- CreateIndex
CREATE INDEX "event_attendee_status_idx" ON "event_attendee"("status");

-- CreateIndex
CREATE INDEX "event_alarm_eventId_idx" ON "event_alarm"("eventId");

-- CreateIndex
CREATE INDEX "event_alarm_action_idx" ON "event_alarm"("action");

-- CreateIndex
CREATE INDEX "event_category_eventId_idx" ON "event_category"("eventId");

-- CreateIndex
CREATE INDEX "event_category_category_idx" ON "event_category"("category");

-- CreateIndex
CREATE UNIQUE INDEX "event_category_eventId_category_key" ON "event_category"("eventId", "category");

-- CreateIndex
CREATE INDEX "event_resource_eventId_idx" ON "event_resource"("eventId");

-- CreateIndex
CREATE INDEX "event_resource_resource_idx" ON "event_resource"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "event_resource_eventId_resource_key" ON "event_resource"("eventId", "resource");

-- CreateIndex
CREATE INDEX "recurrence_date_eventId_idx" ON "recurrence_date"("eventId");

-- CreateIndex
CREATE INDEX "recurrence_date_type_idx" ON "recurrence_date"("type");

-- CreateIndex
CREATE INDEX "recurrence_date_date_idx" ON "recurrence_date"("date");

-- CreateIndex
CREATE UNIQUE INDEX "recurrence_date_eventId_date_type_key" ON "recurrence_date"("eventId", "date", "type");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_share_link_token_key" ON "calendar_share_link"("token");

-- CreateIndex
CREATE INDEX "calendar_share_link_calendarId_idx" ON "calendar_share_link"("calendarId");

-- CreateIndex
CREATE INDEX "calendar_share_link_token_idx" ON "calendar_share_link"("token");

-- CreateIndex
CREATE INDEX "calendar_share_link_isActive_idx" ON "calendar_share_link"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_share_bundle_token_key" ON "calendar_share_bundle"("token");

-- CreateIndex
CREATE INDEX "calendar_share_bundle_token_idx" ON "calendar_share_bundle"("token");

-- CreateIndex
CREATE INDEX "calendar_share_bundle_isActive_idx" ON "calendar_share_bundle"("isActive");

-- CreateIndex
CREATE INDEX "share_bundle_calendar_bundleId_idx" ON "share_bundle_calendar"("bundleId");

-- CreateIndex
CREATE INDEX "share_bundle_calendar_calendarId_idx" ON "share_bundle_calendar"("calendarId");

-- CreateIndex
CREATE UNIQUE INDEX "share_bundle_calendar_bundleId_calendarId_key" ON "share_bundle_calendar"("bundleId", "calendarId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendee" ADD CONSTRAINT "event_attendee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_alarm" ADD CONSTRAINT "event_alarm_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_category" ADD CONSTRAINT "event_category_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_resource" ADD CONSTRAINT "event_resource_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrence_date" ADD CONSTRAINT "recurrence_date_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_bundle_calendar" ADD CONSTRAINT "share_bundle_calendar_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "calendar_share_bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
