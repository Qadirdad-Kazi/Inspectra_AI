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
import { CurrentUser } from '../../common/decorators';
import type { AuthPrincipal } from '../../common/types/auth.types';

@ApiTags('Screenshot Studio')
@ApiBearerAuth()
@Controller('organizations/:organizationId/screenshot-studio')
export class ScreenshotStudioController {
  constructor(private readonly service: ScreenshotStudioService) {}

  @Get('entitlement')
  @ApiOperation({ summary: 'Check feature access entitlement for Screenshot Studio' })
  checkEntitlement(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthPrincipal,
  ) {
    return this.service.checkEntitlement(user.userId, orgId);
  }

  @Post('projects')
  @ApiOperation({ summary: 'Create a new screenshot studio project' })
  createProject(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: CreateScreenshotProjectDto,
  ) {
    return this.service.createProject(user.userId, orgId, dto);
  }

  @Get('projects')
  @ApiOperation({ summary: 'List screenshot projects in organization' })
  listProjects(@Param('organizationId') orgId: string) {
    return this.service.listProjects(orgId);
  }

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get a specific screenshot project' })
  getProject(
    @Param('organizationId') orgId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.service.getProject(orgId, projectId);
  }

  @Patch('projects/:projectId')
  @ApiOperation({ summary: 'Update canvas configuration or project details' })
  updateProject(
    @Param('organizationId') orgId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateScreenshotProjectDto,
  ) {
    return this.service.updateProject(orgId, projectId, dto);
  }

  @Delete('projects/:projectId')
  @ApiOperation({ summary: 'Delete a screenshot project' })
  deleteProject(
    @Param('organizationId') orgId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.service.deleteProject(orgId, projectId);
  }

  @Post('ai-generate')
  @ApiOperation({ summary: 'Synthesize AI captions, layouts, and themes for screenshots' })
  generateAiScreenshots(@Body() dto: AiGenerateScreenshotsDto) {
    return this.service.generateAiScreenshots(dto);
  }
}
