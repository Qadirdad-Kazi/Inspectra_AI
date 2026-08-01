import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { generateToken, hashToken } from '../utils/crypto';
import type { AuthPrincipal } from '../types/auth.types';

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
};

@Injectable()
export class SessionService {
  private readonly accessTtlSec = Number(process.env.JWT_ACCESS_TTL_SEC ?? 60 * 60);
  private readonly refreshDays = Number(process.env.SESSION_REFRESH_DAYS ?? 30);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async createSession(user: {
    id: string;
    email: string;
    isPlatformAdmin?: boolean;
  }): Promise<TokenPair> {
    const refreshToken = generateToken(48);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshDays);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        sid: session.id,
        padmin: Boolean(user.isPlatformAdmin),
      },
      { expiresIn: this.accessTtlSec },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtlSec,
      sessionId: session.id,
    };
  }

  async verifyAccessToken(token: string): Promise<AuthPrincipal> {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
        sid?: string;
        padmin?: boolean;
      }>(token);

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'User inactive' });
      }

      if (payload.sid) {
        const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
        if (!session || session.revokedAt || session.expiresAt < new Date()) {
          throw new UnauthorizedException({
            code: 'UNAUTHENTICATED',
            message: 'Session expired',
          });
        }
        await this.prisma.session.update({
          where: { id: session.id },
          data: { lastSeenAt: new Date() },
        });
      }

      return {
        userId: user.id,
        email: user.email,
        sessionId: payload.sid,
        isPlatformAdmin: user.isPlatformAdmin,
      };
    } catch {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Invalid or expired credentials',
      });
    }
  }

  async refresh(refreshToken: string): Promise<TokenPair & { user: { id: string; email: string; name: string | null; isPlatformAdmin: boolean } }> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Invalid refresh token',
      });
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.createSession(session.user);
    return {
      ...tokens,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        isPlatformAdmin: session.user.isPlatformAdmin,
      },
    };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
