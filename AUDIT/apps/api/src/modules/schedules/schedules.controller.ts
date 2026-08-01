import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { SchedulesService } from './schedules.service';
import { CurrentUser, Roles } from '../../common/decorators';
import type { AuthPrincipal } from '../../common/types/auth.types';

export class CreateScheduleDto {
  @ApiProperty()
  @IsString()
  assetId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ description: 'Minutes between runs', example: 10080 })
  @IsOptional()
  @IsInt()
  @Min(60)
  intervalMinutes?: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(60)
  intervalMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

@ApiTags('Schedules')
@ApiBearerAuth()
@Controller('organizations/:organizationId/schedules')
export class SchedulesController {
  constructor(private readonly schedules: SchedulesService) {}

  @Get()
  @Roles('viewer')
  list(@Param('organizationId') organizationId: string) {
    return this.schedules.list(organizationId);
  }

  @Post('dispatch/due')
  @Roles('admin')
  @ApiOperation({ summary: 'Process due schedules for this organization (cron tick)' })
  dispatchDue(@Param('organizationId') organizationId: string) {
    return this.schedules.runDue(organizationId);
  }

  @Post()
  @Roles('analyst')
  create(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.schedules.create(organizationId, user.userId, dto);
  }

  @Patch(':scheduleId')
  @Roles('analyst')
  update(
    @Param('organizationId') organizationId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedules.update(organizationId, scheduleId, dto);
  }

  @Delete(':scheduleId')
  @Roles('admin')
  remove(
    @Param('organizationId') organizationId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.schedules.remove(organizationId, scheduleId);
  }

  @Post(':scheduleId/run')
  @Roles('analyst')
  @ApiOperation({ summary: 'Trigger schedule immediately' })
  runNow(
    @Param('organizationId') organizationId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.schedules.runNow(organizationId, scheduleId);
  }
}
