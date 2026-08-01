import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { WorkflowLoggerService } from '../../common/workflow/workflow-logger.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, WorkflowLoggerService],
  exports: [ReportsService],
})
export class ReportsModule {}
