import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AuthProvider, MembershipRole } from '@inspectra/db';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/crypto';
import { isUnlimitedAuditEmail } from '../../common/utils/unlimited-access';

/**
 * Ensures the unlimited-access owner account exists (email allowlist).
 * Default: qadirdadkazi@gmail.com / PASSWORD1 (override via SEED_OWNER_* env).
 */
@Injectable()
export class OwnerSeedService implements OnModuleInit {
  private readonly log = new Logger(OwnerSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.SEED_OWNER === 'false') return;
    try {
      await this.ensureOwner();
    } catch (err) {
      this.log.error(`Owner seed failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  private async ensureOwner() {
    const email = (
      process.env.SEED_OWNER_EMAIL ?? 'qadirdadkazi@gmail.com'
    ).trim().toLowerCase();
    if (!isUnlimitedAuditEmail(email)) {
      this.log.warn(`SEED_OWNER_EMAIL ${email} is not in unlimited allowlist — skipping seed`);
      return;
    }

    const password = process.env.SEED_OWNER_PASSWORD ?? 'PASSWORD1';
    const name = process.env.SEED_OWNER_NAME ?? 'Qadirdad Kazi';
    const passwordHash = await hashPassword(password);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          isPlatformAdmin: true,
          isActive: true,
          name: existing.name || name,
        },
      });
      this.log.log(`Updated unlimited owner ${email}`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          isPlatformAdmin: true,
          emailVerifiedAt: new Date(),
          identities: {
            create: {
              provider: AuthProvider.password,
              providerUserId: `password:${email}`,
              providerEmail: email,
            },
          },
        },
      });

      let slug = 'inspectra-owner';
      for (let i = 0; i < 8; i++) {
        const taken = await tx.organization.findUnique({ where: { slug } });
        if (!taken) break;
        slug = `inspectra-owner-${i + 1}`;
      }

      await tx.organization.create({
        data: {
          name: 'Inspectra Owner',
          slug,
          settings: { create: { metadata: { unlimitedAudits: true } } },
          memberships: {
            create: { userId: user.id, role: MembershipRole.owner },
          },
          workspaces: {
            create: {
              name: 'Default',
              slug: 'default',
              description: 'Owner workspace',
            },
          },
        },
      });
    });

    this.log.log(`Seeded unlimited owner ${email}`);
  }
}
