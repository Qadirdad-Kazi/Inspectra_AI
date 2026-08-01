import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditsService } from './audits.service';
import {
  AssetResponseDto,
  AuditEventResponseDto,
  AuditResponseDto,
  AuditStageResponseDto,
  CreateAssetDto,
  CreateAuditDto,
  CreateSuppressionDto,
  FindingResponseDto,
  ListAuditsQueryDto,
  ListFindingsQueryDto,
  UpdateFindingTriageDto,
} from './dto/audit.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import type { AuthPrincipal } from '../../common/types/auth.types';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedOkResponse } from '../../common/dto/pagination.dto';

@ApiTags('Audits')
@ApiBearerAuth()
@Controller('organizations/:organizationId')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Post('assets')
  @Roles('analyst')
  @ApiOperation({ summary: 'Register an auditable asset' })
  createAsset(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.auditsService.createAsset(organizationId, dto);
  }

  @Get('assets')
  @Roles('viewer')
  @ApiPaginatedOkResponse(AssetResponseDto)
  listAssets(
    @Param('organizationId') organizationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.auditsService.listAssets(organizationId, query);
  }

  @Get('assets/:assetId')
  @Roles('viewer')
  getAsset(
    @Param('organizationId') organizationId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.auditsService.getAsset(organizationId, assetId);
  }

  @Post('audits')
  @Roles('analyst')
  @ApiOperation({ summary: 'Create audit and enqueue background run_audit job' })
  createAudit(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: CreateAuditDto,
  ): Promise<AuditResponseDto> {
    return this.auditsService.createAudit(organizationId, user.userId, dto);
  }

  @Get('audits')
  @Roles('viewer')
  @ApiPaginatedOkResponse(AuditResponseDto)
  listAudits(
    @Param('organizationId') organizationId: string,
    @Query() query: ListAuditsQueryDto,
  ) {
    return this.auditsService.listAudits(organizationId, query);
  }

  @Get('audits/:auditId')
  @Roles('viewer')
  getAudit(
    @Param('organizationId') organizationId: string,
    @Param('auditId') auditId: string,
  ) {
    return this.auditsService.getAudit(organizationId, auditId);
  }

  @Post('audits/:auditId/cancel')
  @Roles('analyst')
  cancelAudit(
    @Param('organizationId') organizationId: string,
    @Param('auditId') auditId: string,
  ) {
    return this.auditsService.cancelAudit(organizationId, auditId);
  }

  @Post('audits/:auditId/share')
  @Roles('analyst')
  @ApiOperation({ summary: 'Create or return a public share token for this audit' })
  enableShare(
    @Param('organizationId') organizationId: string,
    @Param('auditId') auditId: string,
  ) {
    return this.auditsService.enableShare(organizationId, auditId);
  }

  @Post('audits/:auditId/unshare')
  @Roles('admin')
  @ApiOperation({ summary: 'Revoke public share link' })
  revokeShare(
    @Param('organizationId') organizationId: string,
    @Param('auditId') auditId: string,
  ) {
    return this.auditsService.revokeShare(organizationId, auditId);
  }

  @Post('audits/:auditId/intelligence')
  @Roles('analyst')
  @ApiOperation({
    summary: 'Run / re-run AI intelligence orchestrator on completed audit results',
  })
  runIntelligence(
    @Param('organizationId') organizationId: string,
    @Param('auditId') auditId: string,
  ) {
    return this.auditsService.runIntelligence(organizationId, auditId);
  }

  @Get('audits/:auditId/stages')
  @Roles('viewer')
  @ApiPaginatedOkResponse(AuditStageResponseDto)
  listStages(
    @Param('organizationId') organizationId: string,
    @Param('auditId') auditId: string,
  ) {
    return this.auditsService.listStages(organizationId, auditId);
  }

  @Get('audits/:auditId/events')
  @Roles('viewer')
  @ApiPaginatedOkResponse(AuditEventResponseDto)
  listEvents(
    @Param('organizationId') organizationId: string,
    @Param('auditId') auditId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.auditsService.listEvents(organizationId, auditId, query);
  }

  @Get('audits/:auditId/findings')
  @Roles('viewer')
  @ApiPaginatedOkResponse(FindingResponseDto)
  listFindings(
    @Param('organizationId') organizationId: string,
    @Param('auditId') auditId: string,
    @Query() query: ListFindingsQueryDto,
  ) {
    return this.auditsService.listFindings(organizationId, auditId, query);
  }

  @Patch('audits/:auditId/findings/:findingId/triage')
  @Roles('analyst')
  updateFindingTriage(
    @Param('organizationId') organizationId: string,
    @Param('auditId') auditId: string,
    @Param('findingId') findingId: string,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: UpdateFindingTriageDto,
  ) {
    return this.auditsService.updateFindingTriage(
      organizationId,
      auditId,
      findingId,
      user.userId,
      dto,
    );
  }

  @Post('suppressions')
  @Roles('admin')
  createSuppression(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: CreateSuppressionDto,
  ) {
    return this.auditsService.createSuppression(organizationId, user.userId, dto);
  }
}
