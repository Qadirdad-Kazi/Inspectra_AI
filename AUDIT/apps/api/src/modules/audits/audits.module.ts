import { Module } from '@nestjs/common';
import { AuditsController } from './audits.controller';
import { PublicAuditsController } from './public-audits.controller';
import { AuditsService } from './audits.service';
import { WebsiteAuditRunner } from './runner/website-audit.runner';
import { StoreAuditRunner } from './runner/store-audit.runner';
import {
  AiIntelligenceService,
  PrismaAiMemoryStore,
} from './intelligence/ai-intelligence.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule],
  controllers: [AuditsController, PublicAuditsController],
  providers: [
    AuditsService,
    WebsiteAuditRunner,
    StoreAuditRunner,
    PrismaAiMemoryStore,
    AiIntelligenceService,
  ],
  exports: [AuditsService, AiIntelligenceService],
})
export class AuditsModule {}
