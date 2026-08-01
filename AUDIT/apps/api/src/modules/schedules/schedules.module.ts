import { Module, forwardRef } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { WorkflowLoggerService } from '../../common/workflow/workflow-logger.service';
import { AuditsModule } from '../audits/audits.module';

@Module({
  imports: [forwardRef(() => AuditsModule)],
  controllers: [SchedulesController],
  providers: [SchedulesService, WorkflowLoggerService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
