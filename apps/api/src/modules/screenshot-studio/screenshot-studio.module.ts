import { Module } from '@nestjs/common';
import { ScreenshotStudioController } from './screenshot-studio.controller';
import { ScreenshotStudioService } from './screenshot-studio.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScreenshotStudioController],
  providers: [ScreenshotStudioService],
  exports: [ScreenshotStudioService],
})
export class ScreenshotStudioModule {}
