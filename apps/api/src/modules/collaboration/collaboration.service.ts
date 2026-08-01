import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toPaginationMeta } from '../../common/dto/pagination-query.dto';

@Injectable()
export class CollaborationService {
  constructor(private readonly prisma: PrismaService) {}

  async listComments(organizationId: string, auditId: string) {
    await this.ensureAudit(organizationId, auditId);
    const rows = await this.prisma.auditComment.findMany({
      where: { organizationId, auditId, parentId: null },
      include: {
        author: { select: { id: true, name: true, email: true } },
        replies: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      data: rows.map((r) => this.serialize(r)),
      meta: toPaginationMeta(1, rows.length || 1, rows.length),
    };
  }

  async addComment(
    organizationId: string,
    auditId: string,
    authorId: string,
    body: string,
    parentId?: string,
  ) {
    await this.ensureAudit(organizationId, auditId);
    if (parentId) {
      const parent = await this.prisma.auditComment.findFirst({
        where: { id: parentId, auditId, organizationId },
      });
      if (!parent) {
        throw new NotFoundException({ code: 'COMMENT_NOT_FOUND', message: 'Parent comment not found' });
      }
    }
    const row = await this.prisma.auditComment.create({
      data: { organizationId, auditId, authorId, body, parentId },
      include: {
        author: { select: { id: true, name: true, email: true } },
        replies: {
          include: { author: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    return this.serialize(row);
  }

  private async ensureAudit(organizationId: string, auditId: string) {
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId },
    });
    if (!audit) {
      throw new NotFoundException({ code: 'AUDIT_NOT_FOUND', message: 'Audit not found' });
    }
  }

  private serialize(row: {
    id: string;
    body: string;
    parentId: string | null;
    createdAt: Date;
    author: { id: string; name: string | null; email: string };
    replies?: Array<{
      id: string;
      body: string;
      createdAt: Date;
      author: { id: string; name: string | null; email: string };
    }>;
  }) {
    return {
      id: row.id,
      body: row.body,
      parentId: row.parentId,
      createdAt: row.createdAt.toISOString(),
      author: {
        id: row.author.id,
        name: row.author.name,
        email: row.author.email,
      },
      replies: (row.replies ?? []).map((r) => ({
        id: r.id,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
        author: {
          id: r.author.id,
          name: r.author.name,
          email: r.author.email,
        },
      })),
    };
  }
}
