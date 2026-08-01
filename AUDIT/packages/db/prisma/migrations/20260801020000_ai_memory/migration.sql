-- AlterTable
ALTER TABLE "organization_settings" ALTER COLUMN "allowAiTriage" SET DEFAULT true;

-- CreateTable
CREATE TABLE "ai_memory_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT,
    "auditId" TEXT,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "promptVersion" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_memory_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_memory_entries_organizationId_kind_idx" ON "ai_memory_entries"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "ai_memory_entries_assetId_idx" ON "ai_memory_entries"("assetId");

-- CreateIndex
CREATE INDEX "ai_memory_entries_auditId_idx" ON "ai_memory_entries"("auditId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_memory_entries_organizationId_assetId_key_key" ON "ai_memory_entries"("organizationId", "assetId", "key");

-- AddForeignKey
ALTER TABLE "ai_memory_entries" ADD CONSTRAINT "ai_memory_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_memory_entries" ADD CONSTRAINT "ai_memory_entries_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_memory_entries" ADD CONSTRAINT "ai_memory_entries_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "audits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
