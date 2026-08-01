import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, SCOPES_KEY, IS_PUBLIC_KEY } from '../decorators';
import { ROLE_RANK, type Role } from '../constants';
import type { AuthPrincipal } from '../types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { apiKeyHasScopes } from '../utils/api-key-scopes';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if ((!required || required.length === 0) && (!requiredScopes || requiredScopes.length === 0)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthPrincipal;
      params: Record<string, string | undefined>;
      headers: Record<string, string | undefined>;
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'No principal' });
    }

    if (user.isPlatformAdmin) {
      user.role = 'owner';
      return true;
    }

    const organizationId =
      request.params.organizationId ??
      request.headers['x-organization-id'] ??
      user.organizationId;

    if (!organizationId) {
      throw new ForbiddenException({
        code: 'ORG_REQUIRED',
        message: 'Organization context required',
      });
    }

    if (user.apiKeyId) {
      if (user.organizationId !== organizationId) {
        throw new ForbiddenException({
          code: 'NOT_A_MEMBER',
          message: 'API key is not valid for this organization',
        });
      }

      if (requiredScopes?.length && !apiKeyHasScopes(user.scopes, requiredScopes)) {
        throw new ForbiddenException({
          code: 'INSUFFICIENT_SCOPE',
          message: `API key requires scopes: ${requiredScopes.join(', ')}`,
        });
      }

      if (required?.length && user.role) {
        const minRequired = Math.min(...required.map((r) => ROLE_RANK[r]));
        if (ROLE_RANK[user.role] < minRequired) {
          throw new ForbiddenException({
            code: 'INSUFFICIENT_ROLE',
            message: `Requires one of: ${required.join(', ')} (API key scopes map to ${user.role})`,
          });
        }
      }
      return true;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: user.userId },
      },
    });
    if (!membership) {
      throw new ForbiddenException({
        code: 'NOT_A_MEMBER',
        message: 'Not a member of this organization',
      });
    }

    const role = membership.role as Role;
    user.role = role;
    user.organizationId = organizationId;

    if (!required || required.length === 0) return true;

    const minRequired = Math.min(...required.map((r) => ROLE_RANK[r]));
    if (ROLE_RANK[role] < minRequired) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_ROLE',
        message: `Requires one of: ${required.join(', ')}`,
      });
    }
    return true;
  }
}
