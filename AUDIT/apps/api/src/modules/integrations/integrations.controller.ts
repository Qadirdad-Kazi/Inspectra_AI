import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { Roles } from '../../common/decorators';

export class UpsertIntegrationDto {
  @ApiProperty({ enum: ['slack', 'jira'] })
  @IsString()
  type!: string;

  @ApiProperty({ type: Object })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiPropertyOptional({ default: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class JiraIssueDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  summary!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  description!: string;
}

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('organizations/:organizationId/integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  @Roles('viewer')
  list(@Param('organizationId') organizationId: string) {
    return this.integrations.list(organizationId);
  }

  @Put()
  @Roles('admin')
  @ApiOperation({ summary: 'Create or update Slack/Jira integration' })
  upsert(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpsertIntegrationDto,
  ) {
    return this.integrations.upsert(
      organizationId,
      dto.type,
      dto.config,
      dto.status ?? 'active',
    );
  }

  @Delete(':type')
  @Roles('admin')
  remove(
    @Param('organizationId') organizationId: string,
    @Param('type') type: string,
  ) {
    return this.integrations.remove(organizationId, type);
  }

  @Post(':type/test')
  @Roles('admin')
  test(
    @Param('organizationId') organizationId: string,
    @Param('type') type: string,
  ) {
    return this.integrations.test(organizationId, type);
  }

  @Post('jira/issues')
  @Roles('analyst')
  createJiraIssue(
    @Param('organizationId') organizationId: string,
    @Body() dto: JiraIssueDto,
  ) {
    return this.integrations.createJiraFromFinding(organizationId, dto);
  }
}
