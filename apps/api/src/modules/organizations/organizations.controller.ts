import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  CreateWorkspaceDto,
  InvitationResponseDto,
  InviteMemberDto,
  MembershipResponseDto,
  OrganizationResponseDto,
  UpdateMemberRoleDto,
  UpdateOrganizationDto,
  UpdateOrganizationSettingsDto,
  WorkspaceResponseDto,
} from './dto/organization.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import type { AuthPrincipal } from '../../common/types/auth.types';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedOkResponse } from '../../common/dto/pagination.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create organization (caller becomes owner)' })
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(user.userId, dto);
  }

  @Get()
  @ApiPaginatedOkResponse(OrganizationResponseDto)
  @ApiOperation({ summary: 'List organizations for current user' })
  list(@CurrentUser() user: AuthPrincipal, @Query() query: PaginationQueryDto) {
    return this.organizationsService.listForUser(user.userId, query);
  }

  @Get(':organizationId')
  @Roles('viewer')
  @ApiOperation({ summary: 'Get organization by id' })
  get(@Param('organizationId') organizationId: string) {
    return this.organizationsService.get(organizationId);
  }

  @Patch(':organizationId')
  @Roles('admin')
  update(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(organizationId, dto);
  }

  @Patch(':organizationId/settings')
  @Roles('admin')
  updateSettings(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    return this.organizationsService.updateSettings(organizationId, dto);
  }

  @Get(':organizationId/members')
  @Roles('viewer')
  @ApiPaginatedOkResponse(MembershipResponseDto)
  listMembers(
    @Param('organizationId') organizationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.organizationsService.listMembers(organizationId, query);
  }

  @Post(':organizationId/invitations')
  @Roles('admin')
  invite(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: InviteMemberDto,
  ): Promise<InvitationResponseDto> {
    return this.organizationsService.invite(organizationId, user.userId, dto);
  }

  @Patch(':organizationId/members/:membershipId')
  @Roles('admin')
  updateMemberRole(
    @Param('organizationId') organizationId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.organizationsService.updateMemberRole(
      organizationId,
      membershipId,
      dto,
    );
  }

  @Delete(':organizationId/members/:membershipId')
  @Roles('admin')
  removeMember(
    @Param('organizationId') organizationId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.organizationsService.removeMember(organizationId, membershipId);
  }

  @Post(':organizationId/workspaces')
  @Roles('admin')
  createWorkspace(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.organizationsService.createWorkspace(organizationId, dto);
  }

  @Get(':organizationId/workspaces')
  @Roles('viewer')
  @ApiPaginatedOkResponse(WorkspaceResponseDto)
  listWorkspaces(
    @Param('organizationId') organizationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.organizationsService.listWorkspaces(organizationId, query);
  }
}
