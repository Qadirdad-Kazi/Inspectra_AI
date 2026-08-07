import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@inspectra/db';
import {
  CreateScreenshotProjectDto,
  UpdateScreenshotProjectDto,
  AiGenerateScreenshotsDto,
} from './dto/studio.dto';
import { generateScreenshotSetSpecs } from '@inspectra/ai-intelligence';
import { chatCompletions, isLlmAvailable, safeParseJson } from '@inspectra/llm';

type StudioMeta = {
  screenshotStudio?: {
    active?: boolean;
    planId?: string;
    expiresAt?: string | null;
  };
};

@Injectable()
export class ScreenshotStudioService {
  constructor(private readonly prisma: PrismaService) {}

  async checkEntitlement(userId: string, orgId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('User not found');

    if (user.isPlatformAdmin) {
      return {
        hasAccess: true,
        reason: 'Platform Admin — unrestricted',
        unlocked: true,
        plan: 'admin',
        expiresAt: null as string | null,
      };
    }

    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    // Org owners/admins can operate Studio without a separate purchase
    if (membership.role === 'owner' || membership.role === 'admin') {
      return {
        hasAccess: true,
        reason: 'Organization Admin',
        unlocked: true,
        plan: membership.role,
        expiresAt: null as string | null,
      };
    }

    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId: orgId },
    });
    const meta = (settings?.metadata ?? {}) as StudioMeta;
    const studio = meta.screenshotStudio;
    if (studio?.active) {
      const expiresAt = studio.expiresAt ? new Date(studio.expiresAt) : null;
      if (!expiresAt || expiresAt.getTime() > Date.now()) {
        return {
          hasAccess: true,
          reason: `Studio plan: ${studio.planId ?? 'active'}`,
          unlocked: true,
          plan: studio.planId ?? 'active',
          expiresAt: studio.expiresAt ?? null,
        };
      }
    }

    return {
      hasAccess: false,
      reason: 'Studio locked — choose Weekly, Monthly, or Custom access',
      unlocked: false,
      plan: null,
      expiresAt: null as string | null,
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
        canvasConfig: (dto.canvasConfig as Prisma.InputJsonValue) || {},
        exportSettings: (dto.exportSettings as Prisma.InputJsonValue) || {},
      },
    });
  }

  async listProjects(orgId: string) {
    return this.prisma.screenshotStudioProject.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getProject(orgId: string, projectId: string) {
    const project = await this.prisma.screenshotStudioProject.findFirst({
      where: { id: projectId, organizationId: orgId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
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
        ...(dto.canvasConfig && {
          canvasConfig: dto.canvasConfig as Prisma.InputJsonValue,
        }),
        ...(dto.exportSettings && {
          exportSettings: dto.exportSettings as Prisma.InputJsonValue,
        }),
      },
    });
  }

  async deleteProject(orgId: string, projectId: string) {
    await this.getProject(orgId, projectId);
    await this.prisma.screenshotStudioProject.delete({ where: { id: projectId } });
    return { success: true };
  }

  async generateAiScreenshots(dto: AiGenerateScreenshotsDto) {
    const base = generateScreenshotSetSpecs({
      appName: dto.appName,
      appDescription: dto.appDescription,
      targetPlatform: dto.targetPlatform,
      theme: dto.theme,
      primaryColor: dto.primaryColor,
      auditFindingsSummary: dto.auditFindingsSummary,
      rawImageCount: dto.rawScreenshotUrls?.length || 0,
    });

    if (!isLlmAvailable()) {
      return { ...base, generatedBy: 'heuristic' as const };
    }

    try {
      const result = await chatCompletions({
        temperature: 0.5,
        json: true,
        timeoutMs: 45000,
        messages: [
          {
            role: 'system',
            content:
              'You write App Store / Play Store screenshot marketing copy. Return JSON {slides:[{headline,subhead,badgeText}]} with exactly 4 slides. No fix suggestions — copy only. Keep headlines under 8 words.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              appName: dto.appName,
              appDescription: dto.appDescription,
              theme: dto.theme,
              findings: dto.auditFindingsSummary?.slice(0, 4),
              seedSlides: base.slides.map((s) => ({
                headline: s.headline,
                subhead: s.subhead,
              })),
            }),
          },
        ],
      });

      const parsed = result?.text
        ? safeParseJson<{
            slides?: Array<{ headline?: string; subhead?: string; badgeText?: string }>;
          }>(result.text)
        : null;

      if (parsed?.slides?.length) {
        const slides = base.slides.map((slide, i) => {
          const llm = parsed.slides?.[i];
          if (!llm) return slide;
          return {
            ...slide,
            headline: llm.headline?.trim() || slide.headline,
            subhead: llm.subhead?.trim() || slide.subhead,
            badgeText: llm.badgeText?.trim() || slide.badgeText,
          };
        });
        return {
          ...base,
          slides,
          generatedBy: 'llm' as const,
          model: result?.model,
        };
      }
    } catch {
      /* fall through to heuristic */
    }

    return { ...base, generatedBy: 'heuristic' as const };
  }
}
