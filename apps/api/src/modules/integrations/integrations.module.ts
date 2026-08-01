import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { WorkflowLoggerService } from '../../common/workflow/workflow-logger.service';

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, WorkflowLoggerService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
