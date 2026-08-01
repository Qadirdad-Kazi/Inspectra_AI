-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_isPlatformAdmin_idx" ON "users"("isPlatformAdmin");
