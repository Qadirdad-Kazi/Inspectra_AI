import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScreenshotStudioService } from './screenshot-studio.service';
import {
  CreateScreenshotProjectDto,
  UpdateScreenshotProjectDto,
  AiGenerateScreenshotsDto,
} from './dto/studio.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import type { AuthPrincipal } from '../../common/types/auth.types';

@ApiTags('Screenshot Studio')
@ApiBearerAuth()
@Controller('organizations/:organizationId/screenshot-studio')
export class ScreenshotStudioController {
  constructor(private readonly service: ScreenshotStudioService) {}

  @Get('entitlement')
  @Roles('viewer')
  @ApiOperation({ summary: 'Check feature access entitlement for Screenshot Studio' })
  checkEntitlement(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthPrincipal,
  ) {
    return this.service.checkEntitlement(user.userId, orgId);
  }

  @Post('projects')
  @Roles('analyst')
  @ApiOperation({ summary: 'Create a new screenshot studio project' })
  createProject(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: CreateScreenshotProjectDto,
  ) {
    return this.service.createProject(user.userId, orgId, dto);
  }

  @Get('projects')
  @Roles('viewer')
  @ApiOperation({ summary: 'List screenshot projects in organization' })
  listProjects(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthPrincipal,
  ) {
    return this.service.listProjects(user.userId, orgId);
  }

  @Get('projects/:projectId')
  @Roles('viewer')
  @ApiOperation({ summary: 'Get a specific screenshot project' })
  getProject(
    @Param('organizationId') orgId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthPrincipal,
  ) {
    return this.service.getProject(user.userId, orgId, projectId);
  }

  @Patch('projects/:projectId')
  @Roles('analyst')
  @ApiOperation({ summary: 'Update canvas configuration or project details' })
  updateProject(
    @Param('organizationId') orgId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: UpdateScreenshotProjectDto,
  ) {
    return this.service.updateProject(user.userId, orgId, projectId, dto);
  }

  @Delete('projects/:projectId')
  @Roles('analyst')
  @ApiOperation({ summary: 'Delete a screenshot project' })
  deleteProject(
    @Param('organizationId') orgId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthPrincipal,
  ) {
    return this.service.deleteProject(user.userId, orgId, projectId);
  }

  @Post('ai-generate')
  @Roles('analyst')
  @ApiOperation({ summary: 'Synthesize AI captions, layouts, and themes for screenshots' })
  generateAiScreenshots(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: AiGenerateScreenshotsDto,
  ) {
    return this.service.generateAiScreenshots(user.userId, orgId, dto);
  }
}
