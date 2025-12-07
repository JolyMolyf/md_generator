/*
  Warnings:

  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- Add the column only if it doesn't exist (as nullable first)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'User' 
        AND column_name = 'password'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "password" TEXT;
    END IF;
END $$;

-- Update existing rows with a default password (you can change this)
UPDATE "User" SET "password" = 'temp_password_needs_update' WHERE "password" IS NULL;

-- Now make it NOT NULL
ALTER TABLE "User" ALTER COLUMN "password" SET NOT NULL;
