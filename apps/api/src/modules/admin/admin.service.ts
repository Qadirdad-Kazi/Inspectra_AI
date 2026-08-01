import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toPaginationMeta, type PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [users, organizations, activeSubs, notifications] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organization.count(),
      this.prisma.subscription.count({ where: { status: { in: ['active', 'trialing'] } } }),
      this.prisma.notification.count(),
    ]);
    return { users, organizations, activeSubscriptions: activeSubs, notifications };
  }

  async listUsers(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          isPlatformAdmin: true,
          createdAt: true,
          lastLoginAt: true,
        },
      }),
    ]);
    return {
      data: rows.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      })),
      meta: toPaginationMeta(page, pageSize, total),
    };
  }

  async updateUser(
    userId: string,
    dto: { isActive?: boolean; isPlatformAdmin?: boolean },
  ) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: dto.isActive,
          isPlatformAdmin: dto.isPlatformAdmin,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          isPlatformAdmin: true,
        },
      });
      return user;
    } catch {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
  }

  async listOrganizations(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.organization.count(),
      this.prisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { memberships: true } },
        },
      }),
    ]);
    return {
      data: rows.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        isActive: o.isActive,
        memberCount: o._count.memberships,
        createdAt: o.createdAt.toISOString(),
      })),
      meta: toPaginationMeta(page, pageSize, total),
    };
  }
}
