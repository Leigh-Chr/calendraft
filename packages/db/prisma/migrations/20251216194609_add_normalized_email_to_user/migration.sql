-- Add normalizedEmail column to user table
-- This field is required by Better-Auth with emailHarmony plugin

-- Step 1: Add column as nullable first
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "normalizedEmail" TEXT;

-- Step 2: Populate existing rows with normalized email (using email as fallback)
-- Better-Auth normalizes emails (e.g., gmail.com = googlemail.com)
-- For existing data, we'll use the email as the normalized email
UPDATE "user" SET "normalizedEmail" = LOWER(TRIM("email")) WHERE "normalizedEmail" IS NULL;

-- Step 3: Make column NOT NULL
ALTER TABLE "user" ALTER COLUMN "normalizedEmail" SET NOT NULL;

-- Step 4: Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "user_normalizedEmail_key" ON "user"("normalizedEmail");
