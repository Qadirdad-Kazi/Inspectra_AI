import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { AuthPrincipal } from '../types/auth.types';
import type { Role } from '../constants';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Required API-key scopes (JWT users skip this check). */
export const SCOPES_KEY = 'scopes';
export const Scopes = (...scopes: string[]) => SetMetadata(SCOPES_KEY, scopes);

export const ORG_ID_HEADER = 'x-organization-id';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthPrincipal }>();
    return request.user;
  },
);

export const OrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{
      user?: AuthPrincipal;
      headers: Record<string, string | undefined>;
      params: Record<string, string | undefined>;
    }>();
    return (
      request.params.organizationId ??
      request.headers[ORG_ID_HEADER] ??
      request.user?.organizationId
    );
  },
);
