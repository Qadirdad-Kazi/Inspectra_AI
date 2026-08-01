import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toPaginationMeta } from '../../common/dto/pagination-query.dto';
import type {
  ListNotificationsQueryDto,
  MarkReadDto,
  UpdateNotificationPreferenceDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, userId: string, query: ListNotificationsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      organizationId,
      OR: [{ userId }, { userId: null }],
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.channel ? { channel: query.channel as never } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: rows.map((n) => ({
        id: n.id,
        channel: n.channel,
        status: n.status,
        title: n.title,
        body: n.body,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      meta: toPaginationMeta(page, pageSize, total),
    };
  }

  async markRead(organizationId: string, userId: string, dto: MarkReadDto) {
    const where = {
      organizationId,
      OR: [{ userId }, { userId: null }],
      readAt: null,
      ...(dto.notificationIds?.length ? { id: { in: dto.notificationIds } } : {}),
    };
    const result = await this.prisma.notification.updateMany({
      where,
      data: { readAt: new Date(), status: 'read' },
    });
    return { ok: true, updated: result.count };
  }

  async listPreferences(organizationId: string, userId: string) {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { organizationId, userId },
      orderBy: { eventType: 'asc' },
    });
    return {
      data: rows.map((p) => ({
        id: p.id,
        channel: p.channel,
        eventType: p.eventType,
        enabled: p.enabled,
      })),
      meta: toPaginationMeta(1, rows.length || 1, rows.length),
    };
  }

  async upsertPreference(
    organizationId: string,
    userId: string,
    dto: UpdateNotificationPreferenceDto,
  ) {
    const pref = await this.prisma.notificationPreference.upsert({
      where: {
        organizationId_userId_channel_eventType: {
          organizationId,
          userId,
          channel: dto.channel,
          eventType: dto.eventType,
        },
      },
      create: {
        organizationId,
        userId,
        channel: dto.channel,
        eventType: dto.eventType,
        enabled: dto.enabled,
      },
      update: { enabled: dto.enabled },
    });
    return {
      id: pref.id,
      channel: pref.channel,
      eventType: pref.eventType,
      enabled: pref.enabled,
    };
  }

  async enqueue(organizationId: string, input: {
    userId?: string;
    channel: 'in_app' | 'email' | 'webhook' | 'slack';
    title: string;
    body: string;
    eventType: string;
    payload?: Record<string, unknown>;
    dedupeKey?: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        organizationId,
        userId: input.userId,
        channel: input.channel,
        status: input.channel === 'in_app' ? 'sent' : 'pending',
        title: input.title,
        body: input.body,
        payload: (input.payload ?? {}) as object,
        dedupeKey: input.dedupeKey,
        sentAt: input.channel === 'in_app' ? new Date() : null,
      },
    });
    return { id: notification.id, status: notification.status };
  }
}
