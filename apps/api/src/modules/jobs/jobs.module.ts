import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';

/** BullMQ processors intentionally disabled until audit engines ship. */
@Module({
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
