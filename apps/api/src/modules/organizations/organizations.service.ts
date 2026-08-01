import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole } from '@inspectra/db';
import { PrismaService } from '../../prisma/prisma.service';
import { generateToken, hashToken, slugify } from '../../common/utils/crypto';
import { toPaginationMeta } from '../../common/dto/pagination-query.dto';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type {
  CreateOrganizationDto,
  CreateWorkspaceDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  UpdateOrganizationDto,
  UpdateOrganizationSettingsDto,
} from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const slug = dto.slug || slugify(dto.name);
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        region: dto.region ?? 'us',
        settings: { create: {} },
        memberships: {
          create: { userId, role: MembershipRole.owner },
        },
        workspaces: {
          create: { name: 'Default', slug: 'default' },
        },
      },
    });
    return this.serializeOrg(org);
  }

  async listForUser(userId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = { memberships: { some: { userId } } };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { data: rows.map((o) => this.serializeOrg(o)), meta: toPaginationMeta(page, pageSize, total) };
  }

  async get(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { settings: true },
    });
    if (!org) throw new NotFoundException({ code: 'ORG_NOT_FOUND', message: 'Organization not found' });
    return {
      ...this.serializeOrg(org),
      settings: org.settings,
    };
  }

  async update(organizationId: string, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: dto.name,
        slug: dto.slug,
        region: dto.region,
        isActive: dto.isActive,
      },
    });
    return this.serializeOrg(org);
  }

  async updateSettings(organizationId: string, dto: UpdateOrganizationSettingsDto) {
    return this.prisma.organizationSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        retentionDays: dto.retentionDays ?? 90,
        allowAiTriage: dto.allowAiTriage ?? false,
        requireMfa: dto.requireMfa ?? false,
        ssoEnforced: dto.ssoEnforced ?? false,
        allowedEmailDomains: dto.allowedEmailDomains ?? [],
      },
      update: {
        retentionDays: dto.retentionDays,
        allowAiTriage: dto.allowAiTriage,
        requireMfa: dto.requireMfa,
        ssoEnforced: dto.ssoEnforced,
        allowedEmailDomains: dto.allowedEmailDomains,
      },
    });
  }

  async listMembers(organizationId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = { organizationId };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.membership.count({ where }),
      this.prisma.membership.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: rows.map((m) => ({
        id: m.id,
        userId: m.userId,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
      })),
      meta: toPaginationMeta(page, pageSize, total),
    };
  }

  async invite(organizationId: string, inviterId: string, dto: InviteMemberDto) {
    const token = generateToken(24);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId,
        email: dto.email.toLowerCase(),
        role: dto.role as MembershipRole,
        tokenHash: hashToken(token),
        invitedById: inviterId,
        expiresAt,
      },
    });

    await this.prisma.notification.create({
      data: {
        organizationId,
        channel: 'in_app',
        status: 'sent',
        title: 'Invitation sent',
        body: `Invited ${dto.email} as ${dto.role}`,
        sentAt: new Date(),
        dedupeKey: `invite-sent:${invitation.id}`,
      },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      // Returned once for local/dev delivery; production would email this.
      acceptToken: token,
    };
  }

  async updateMemberRole(
    organizationId: string,
    membershipId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
    });
    if (!membership) {
      throw new NotFoundException({ code: 'MEMBER_NOT_FOUND', message: 'Membership not found' });
    }
    if (membership.role === MembershipRole.owner && dto.role !== 'owner') {
      const owners = await this.prisma.membership.count({
        where: { organizationId, role: MembershipRole.owner },
      });
      if (owners <= 1) {
        throw new ForbiddenException({
          code: 'LAST_OWNER',
          message: 'Cannot demote the last owner',
        });
      }
    }
    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { role: dto.role as MembershipRole },
      include: { user: true },
    });
    return {
      id: updated.id,
      userId: updated.userId,
      email: updated.user.email,
      role: updated.role,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async removeMember(organizationId: string, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
    });
    if (!membership) {
      throw new NotFoundException({ code: 'MEMBER_NOT_FOUND', message: 'Membership not found' });
    }
    if (membership.role === MembershipRole.owner) {
      const owners = await this.prisma.membership.count({
        where: { organizationId, role: MembershipRole.owner },
      });
      if (owners <= 1) {
        throw new ForbiddenException({
          code: 'LAST_OWNER',
          message: 'Cannot remove the last owner',
        });
      }
    }
    await this.prisma.membership.delete({ where: { id: membershipId } });
    return { ok: true };
  }

  async createWorkspace(organizationId: string, dto: CreateWorkspaceDto) {
    const ws = await this.prisma.workspace.create({
      data: {
        organizationId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
      },
    });
    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      description: ws.description,
    };
  }

  async listWorkspaces(organizationId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = { organizationId };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.workspace.count({ where }),
      this.prisma.workspace.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: rows.map((w) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        description: w.description,
      })),
      meta: toPaginationMeta(page, pageSize, total),
    };
  }

  private serializeOrg(org: {
    id: string;
    name: string;
    slug: string;
    region: string;
    isActive: boolean;
    createdAt: Date;
  }) {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      region: org.region,
      isActive: org.isActive,
      createdAt: org.createdAt.toISOString(),
    };
  }
}
