-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'run_schedule';
ALTER TYPE "JobType" ADD VALUE 'sync_integration';

-- CreateTable
CREATE TABLE "audit_schedules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 10080,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workflowType" TEXT NOT NULL,
    "referenceId" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_comments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_schedules_organizationId_isActive_nextRunAt_idx" ON "audit_schedules"("organizationId", "isActive", "nextRunAt");
CREATE INDEX "audit_schedules_assetId_idx" ON "audit_schedules"("assetId");
CREATE INDEX "workflow_logs_organizationId_workflowType_createdAt_idx" ON "workflow_logs"("organizationId", "workflowType", "createdAt");
CREATE INDEX "workflow_logs_referenceId_idx" ON "workflow_logs"("referenceId");
CREATE INDEX "audit_comments_auditId_createdAt_idx" ON "audit_comments"("auditId", "createdAt");
CREATE INDEX "audit_comments_organizationId_idx" ON "audit_comments"("organizationId");

ALTER TABLE "audit_schedules" ADD CONSTRAINT "audit_schedules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_schedules" ADD CONSTRAINT "audit_schedules_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_schedules" ADD CONSTRAINT "audit_schedules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workflow_logs" ADD CONSTRAINT "workflow_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_comments" ADD CONSTRAINT "audit_comments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_comments" ADD CONSTRAINT "audit_comments_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_comments" ADD CONSTRAINT "audit_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_comments" ADD CONSTRAINT "audit_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "audit_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
