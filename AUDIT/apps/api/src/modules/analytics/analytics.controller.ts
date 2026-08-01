import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../../common/decorators';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('organizations/:organizationId/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  @Roles('viewer')
  dashboard(@Param('organizationId') organizationId: string) {
    return this.analytics.dashboard(organizationId);
  }

  @Get('workflow-logs')
  @Roles('admin')
  logs(
    @Param('organizationId') organizationId: string,
    @Query('limit') limit?: string,
  ) {
    return this.analytics.workflowLogs(organizationId, Number(limit) || 50);
  }
}
