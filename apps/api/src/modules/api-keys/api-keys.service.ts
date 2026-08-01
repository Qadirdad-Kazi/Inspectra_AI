import { randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashToken } from '../../common/utils/crypto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    const rows = await this.prisma.apiKey.findMany({
      where: { organizationId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        keyPrefix: r.keyPrefix,
        scopes: r.scopes,
        lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
        expiresAt: r.expiresAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async create(
    organizationId: string,
    dto: { name: string; scopes?: string[]; expiresAt?: string },
  ) {
    const secret = randomBytes(24).toString('base64url');
    const plaintext = `ink_${secret}`;
    const keyHash = hashToken(plaintext);
    const keyPrefix = plaintext.slice(0, 10);

    const row = await this.prisma.apiKey.create({
      data: {
        organizationId,
        name: dto.name,
        keyPrefix,
        keyHash,
        scopes: dto.scopes?.length ? dto.scopes : ['audits:read', 'reports:read'],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return {
      id: row.id,
      name: row.name,
      keyPrefix: row.keyPrefix,
      scopes: row.scopes,
      createdAt: row.createdAt.toISOString(),
      apiKey: plaintext,
    };
  }

  async revoke(organizationId: string, apiKeyId: string) {
    const row = await this.prisma.apiKey.findFirst({
      where: { id: apiKeyId, organizationId },
    });
    if (!row) {
      throw new NotFoundException({ code: 'API_KEY_NOT_FOUND', message: 'API key not found' });
    }
    await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }
}
