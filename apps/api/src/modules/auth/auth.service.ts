import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthProvider, InvitationStatus, MembershipRole } from '@inspectra/db';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from '../../common/services/session.service';
import {
  generateToken,
  hashPassword,
  hashToken,
  slugify,
  verifyPassword,
} from '../../common/utils/crypto';
import type {
  AuthSessionResponseDto,
  ExchangeInvitationDto,
  RefreshSessionDto,
  SignInDto,
  SignUpDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  async signUp(dto: SignUpDto): Promise<AuthSessionResponseDto> {
    if (!dto.password || dto.password.length < 12) {
      throw new BadRequestException({
        code: 'PASSWORD_REQUIRED',
        message: 'Password must be at least 12 characters',
      });
    }

    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email already registered' });
    }

    const passwordHash = await hashPassword(dto.password);
    const orgName = dto.organizationName?.trim() || `${dto.name.split(' ')[0]}'s Workspace`;
    const user = await this.createUserWithOrg({
      email,
      name: dto.name,
      passwordHash,
      orgName,
      provider: AuthProvider.password,
      providerUserId: email,
    });

    const tokens = await this.sessions.createSession(user);
    return this.toSessionResponse(user, tokens);
  }

  async signIn(dto: SignInDto): Promise<AuthSessionResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.isActive) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    if (dto.authorizationCode) {
      throw new BadRequestException({
        code: 'USE_OAUTH_CALLBACK',
        message: 'Complete OAuth via /v1/auth/oauth/:provider',
      });
    }

    if (!user.passwordHash || !dto.password) {
      throw new UnauthorizedException({
        code: 'PASSWORD_NOT_SET',
        message: 'Use Google or GitHub to sign in',
      });
    }

    const ok = await verifyPassword(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const tokens = await this.sessions.createSession(user);
    return this.toSessionResponse(user, tokens);
  }

  async refresh(dto: RefreshSessionDto): Promise<AuthSessionResponseDto> {
    const refreshed = await this.sessions.refresh(dto.refreshToken);
    return {
      user: {
        id: refreshed.user.id,
        email: refreshed.user.email,
        name: refreshed.user.name,
      },
      tokens: {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresIn: refreshed.expiresIn,
        tokenType: 'Bearer',
      },
    };
  }

  async signOut(sessionId: string): Promise<{ ok: true }> {
    if (sessionId) await this.sessions.revokeSession(sessionId);
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl,
      isPlatformAdmin: user.isPlatformAdmin,
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    };
  }

  async acceptInvitation(dto: ExchangeInvitationDto, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: hashToken(dto.token) },
    });
    if (!invitation || invitation.status !== InvitationStatus.pending) {
      throw new NotFoundException({ code: 'INVITE_INVALID', message: 'Invitation not found' });
    }
    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.expired },
      });
      throw new BadRequestException({ code: 'INVITE_EXPIRED', message: 'Invitation expired' });
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new BadRequestException({
        code: 'INVITE_EMAIL_MISMATCH',
        message: 'Sign in with the invited email address',
      });
    }

    await this.prisma.$transaction([
      this.prisma.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId,
          },
        },
        create: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
        },
        update: { role: invitation.role },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.accepted, acceptedAt: new Date() },
      }),
    ]);

    return { ok: true, organizationId: invitation.organizationId, role: invitation.role };
  }

  async upsertOAuthUser(input: {
    provider: 'google' | 'github';
    providerUserId: string;
    email: string;
    name?: string;
    imageUrl?: string;
  }): Promise<AuthSessionResponseDto> {
    const provider = input.provider === 'google' ? AuthProvider.google : AuthProvider.github;
    const email = input.email.toLowerCase();

    const identity = await this.prisma.authIdentity.findUnique({
      where: { provider_providerUserId: { provider, providerUserId: input.providerUserId } },
      include: { user: true },
    });

    if (identity?.user) {
      if (!identity.user.isActive) {
        throw new UnauthorizedException({ code: 'USER_INACTIVE', message: 'Account disabled' });
      }
      await this.prisma.user.update({
        where: { id: identity.user.id },
        data: {
          emailVerifiedAt: identity.user.emailVerifiedAt ?? new Date(),
          imageUrl: input.imageUrl ?? identity.user.imageUrl,
          name: identity.user.name ?? input.name,
        },
      });
      const tokens = await this.sessions.createSession(identity.user);
      return this.toSessionResponse(identity.user, tokens);
    }

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      await this.prisma.authIdentity.create({
        data: {
          userId: user.id,
          provider,
          providerUserId: input.providerUserId,
          providerEmail: email,
        },
      });
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          imageUrl: input.imageUrl ?? user.imageUrl,
        },
      });
    } else {
      user = await this.createUserWithOrg({
        email,
        name: input.name || email.split('@')[0] || 'User',
        passwordHash: null,
        orgName: `${(input.name || 'My').split(' ')[0]}'s Workspace`,
        provider,
        providerUserId: input.providerUserId,
        imageUrl: input.imageUrl,
        emailVerifiedAt: new Date(),
      });
    }

    const tokens = await this.sessions.createSession(user);
    return this.toSessionResponse(user, tokens);
  }

  private async createUserWithOrg(input: {
    email: string;
    name: string;
    passwordHash: string | null;
    orgName: string;
    provider: AuthProvider;
    providerUserId: string;
    imageUrl?: string;
    emailVerifiedAt?: Date;
  }) {
    const baseSlug = slugify(input.orgName) || 'workspace';

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash: input.passwordHash,
          imageUrl: input.imageUrl,
          emailVerifiedAt: input.emailVerifiedAt,
          identities: {
            create: {
              provider: input.provider,
              providerUserId: input.providerUserId,
              providerEmail: input.email,
            },
          },
        },
      });

      let slug = baseSlug;
      for (let i = 0; i < 8; i++) {
        const taken = await tx.organization.findUnique({ where: { slug } });
        if (!taken) break;
        slug = `${baseSlug}-${generateToken(3)}`;
      }

      await tx.organization.create({
        data: {
          name: input.orgName,
          slug,
          settings: { create: {} },
          memberships: {
            create: { userId: user.id, role: MembershipRole.owner },
          },
          workspaces: {
            create: { name: 'Default', slug: 'default', description: 'Default workspace' },
          },
          notifications: {
            create: {
              userId: user.id,
              channel: 'in_app',
              status: 'sent',
              title: 'Welcome to Inspectra',
              body: 'Your organization is ready. Audit engines will unlock in a later release.',
              sentAt: new Date(),
              dedupeKey: `welcome:${user.id}`,
            },
          },
        },
      });

      return user;
    });
  }

  private toSessionResponse(
    user: { id: string; email: string; name?: string | null },
    tokens: { accessToken: string; refreshToken: string; expiresIn: number },
  ): AuthSessionResponseDto {
    return {
      user: { id: user.id, email: user.email, name: user.name },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer',
      },
    };
  }
}
