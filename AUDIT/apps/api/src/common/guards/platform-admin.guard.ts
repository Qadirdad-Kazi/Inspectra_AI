import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthPrincipal } from '../types/auth.types';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthPrincipal }>();
    if (!request.user?.isPlatformAdmin) {
      throw new ForbiddenException({
        code: 'PLATFORM_ADMIN_REQUIRED',
        message: 'Platform admin access required',
      });
    }
    return true;
  }
}
