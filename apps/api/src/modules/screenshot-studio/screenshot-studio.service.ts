import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateScreenshotProjectDto } from './dto/create-project.dto';
import { UpdateScreenshotProjectDto } from './dto/update-project.dto';
import { AiGenerateScreenshotsDto } from './dto/ai-generate.dto';
import { generateScreenshotSetSpecs } from '@inspectra/ai-intelligence';

@Injectable()
export class ScreenshotStudioService {
  constructor(private readonly prisma: PrismaService) {}

  async checkEntitlement(userId: string, orgId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new ForbiddenException('User not found');

    // Platform Admins always have access
    if (user.isPlatformAdmin) {
      return {
        hasAccess: true,
        reason: 'Platform Admin Access',
        unlocked: true,
      };
    }

    // Check organization membership & role or subscriptions
    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    // Owners and Admins of the organization are unlocked by default
    if (membership.role === 'owner' || membership.role === 'admin') {
      return {
        hasAccess: true,
        reason: 'Organization Admin',
        unlocked: true,
      };
    }

    // Check for active subscription or addon
    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        organizationId: orgId,
        status: 'active',
      },
    });

    if (activeSub) {
      return {
        hasAccess: true,
        reason: 'Active Subscription Plan',
        unlocked: true,
      };
    }

    return {
      hasAccess: false,
      reason: 'Feature Locked — Addon or Admin Role Required',
      unlocked: false,
    };
  }

  async createProject(userId: string, orgId: string, dto: CreateScreenshotProjectDto) {
    const entitlement = await this.checkEntitlement(userId, orgId);
    if (!entitlement.hasAccess) {
      throw new ForbiddenException(entitlement.reason);
    }

    return this.prisma.screenshotStudioProject.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: dto.name,
        assetId: dto.assetId || null,
        platform: dto.platform || 'ios',
        canvasConfig: (dto.canvasConfig as Record<string, unknown>) || {},
        exportSettings: (dto.exportSettings as Record<string, unknown>) || {},
      },
    });
  }

  async listProjects(orgId: string) {
    return this.prisma.screenshotStudioProject.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async getProject(orgId: string, projectId: string) {
    const project = await this.prisma.screenshotStudioProject.findFirst({
      where: { id: projectId, organizationId: orgId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Screenshot project '${projectId}' not found`);
    }

    return project;
  }

  async updateProject(orgId: string, projectId: string, dto: UpdateScreenshotProjectDto) {
    await this.getProject(orgId, projectId);

    return this.prisma.screenshotStudioProject.update({
      where: { id: projectId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.platform && { platform: dto.platform }),
        ...(dto.canvasConfig && { canvasConfig: dto.canvasConfig as Record<string, unknown> }),
        ...(dto.exportSettings && { exportSettings: dto.exportSettings as Record<string, unknown> }),
      },
    });
  }

  async deleteProject(orgId: string, projectId: string) {
    await this.getProject(orgId, projectId);

    await this.prisma.screenshotStudioProject.delete({
      where: { id: projectId },
    });

    return { success: true };
  }

  async generateAiScreenshots(dto: AiGenerateScreenshotsDto) {
    return generateScreenshotSetSpecs({
      appName: dto.appName,
      appDescription: dto.appDescription,
      targetPlatform: dto.targetPlatform,
      theme: dto.theme,
      primaryColor: dto.primaryColor,
      auditFindingsSummary: dto.auditFindingsSummary,
      rawImageCount: dto.rawScreenshotUrls?.length || 0,
    });
  }
}
