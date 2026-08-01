import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import {
  CreateReportDto,
  ListReportsQueryDto,
  ReportDownloadResponseDto,
  ReportResponseDto,
} from './dto/report.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import type { AuthPrincipal } from '../../common/types/auth.types';
import { ApiPaginatedOkResponse } from '../../common/dto/pagination.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('organizations/:organizationId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @Roles('analyst')
  @ApiOperation({ summary: 'Request report generation (async job with retries)' })
  create(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: CreateReportDto,
  ): Promise<ReportResponseDto> {
    return this.reportsService.create(organizationId, user.userId, dto);
  }

  @Get()
  @Roles('viewer')
  @ApiPaginatedOkResponse(ReportResponseDto)
  list(
    @Param('organizationId') organizationId: string,
    @Query() query: ListReportsQueryDto,
  ) {
    return this.reportsService.list(organizationId, query);
  }

  @Get('preview/:auditId')
  @Roles('viewer')
  @ApiOperation({ summary: 'Report builder preview from audit (no persist)' })
  preview(
    @Param('organizationId') organizationId: string,
    @Param('auditId') auditId: string,
  ) {
    return this.reportsService.preview(organizationId, auditId);
  }

  @Get(':reportId')
  @Roles('viewer')
  get(
    @Param('organizationId') organizationId: string,
    @Param('reportId') reportId: string,
  ) {
    return this.reportsService.get(organizationId, reportId);
  }

  @Get(':reportId/download')
  @Roles('viewer')
  @ApiOperation({ summary: 'Download descriptor for a ready report' })
  download(
    @Param('organizationId') organizationId: string,
    @Param('reportId') reportId: string,
  ): Promise<ReportDownloadResponseDto> {
    return this.reportsService.getDownloadUrl(organizationId, reportId);
  }

  @Get(':reportId/content')
  @Roles('viewer')
  @ApiOperation({ summary: 'Download report body' })
  async content(
    @Param('organizationId') organizationId: string,
    @Param('reportId') reportId: string,
    @Res() res: Response,
  ) {
    const file = await this.reportsService.getContent(organizationId, reportId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename.replace(/"/g, '')}"`,
    );
    res.send(file.body);
  }
}
