import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators';
import { SessionService } from '../services/session.service';
import { PrismaService } from '../../prisma/prisma.service';
import { hashToken } from '../utils/crypto';
import { roleFromApiKeyScopes } from '../utils/api-key-scopes';
import type { AuthPrincipal } from '../types/auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthPrincipal;
    }>();

    const authorization = request.headers.authorization;
    if (!authorization) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Missing Authorization header',
      });
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Invalid Authorization scheme',
      });
    }

    if (token.startsWith('ink_')) {
      const key = await this.prisma.apiKey.findFirst({
        where: {
          keyHash: hashToken(token),
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      if (!key) {
        throw new UnauthorizedException({
          code: 'UNAUTHENTICATED',
          message: 'Invalid API key',
        });
      }
      await this.prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      });
      request.user = {
        userId: `apikey:${key.id}`,
        email: 'api-key@inspectra.local',
        apiKeyId: key.id,
        organizationId: key.organizationId,
        role: roleFromApiKeyScopes(key.scopes),
        scopes: key.scopes,
      };
      return true;
    }

    request.user = await this.sessions.verifyAccessToken(token);
    return true;
  }
}
