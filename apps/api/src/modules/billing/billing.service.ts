import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { Prisma } from '@inspectra/db';
import { PrismaService } from '../../prisma/prisma.service';
import { toPaginationMeta } from '../../common/dto/pagination-query.dto';
import type {
  BillingPortalDto,
  CreateCheckoutSessionDto,
  CreatePackageCheckoutDto,
  CreateStudioCheckoutDto,
  ListUsageQueryDto,
  UsageSummaryQueryDto,
} from './dto/billing.dto';
import { AUDIT_PACKAGES, getAuditPackage } from './packages';
import {
  STUDIO_PLANS,
  getStudioPlan,
  studioAccessDurationDays,
  studioPlanPriceUsd,
} from './studio-plans';
import { isUnlimitedAuditEmail } from '../../common/utils/unlimited-access';

type SettingsMeta = {
  auditCredits?: number;
  unlimitedAudits?: boolean;
  screenshotStudio?: {
    active?: boolean;
    planId?: string;
    expiresAt?: string | null;
  };
};

@Injectable()
export class BillingService {
  private stripe: Stripe | null = null;

  constructor(private readonly prisma: PrismaService) {
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Set STRIPE_SECRET_KEY to enable Stripe checkout',
      });
    }
    return this.stripe;
  }

  /** Local free grants only for non-prod, or when explicitly enabled. Never in production by default. */
  private allowLocalBillingGrants(): boolean {
    if (process.env.ALLOW_LOCAL_BILLING_GRANTS === 'true') return true;
    return process.env.NODE_ENV !== 'production';
  }

  listPackages() {
    return {
      data: AUDIT_PACKAGES.map((p) => ({
        id: p.id,
        name: p.name,
        audits: p.audits,
        priceUsd: p.priceUsd,
        blurb: p.blurb,
        highlighted: Boolean(p.highlighted),
        neverExpires: true,
        subscription: false,
      })),
      note: 'One-time purchases. Credits never expire. No subscription.',
    };
  }

  listStudioPlans() {
    return {
      data: STUDIO_PLANS.map((p) => ({
        id: p.id,
        name: p.name,
        interval: p.interval,
        durationDays: p.durationDays,
        priceUsd: p.priceUsd,
        pricePerDayUsd: p.pricePerDayUsd ?? null,
        blurb: p.blurb,
        highlighted: Boolean(p.highlighted),
        minCustomDays: p.minCustomDays ?? null,
        maxCustomDays: p.maxCustomDays ?? null,
      })),
      note: 'Inspectra Studio access — weekly, monthly, or custom day passes. Separate from audit credits.',
    };
  }

  async grantStudioAccess(
    organizationId: string,
    planId: string,
    durationDays: number,
  ) {
    const existing = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    const meta = { ...((existing?.metadata ?? {}) as SettingsMeta) };
    const expiresAt = new Date(
      Date.now() + durationDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    meta.screenshotStudio = {
      active: true,
      planId,
      expiresAt,
    };
    await this.prisma.organizationSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        metadata: meta as Prisma.InputJsonValue,
      },
      update: { metadata: meta as Prisma.InputJsonValue },
    });
    await this.prisma.notification.create({
      data: {
        organizationId,
        channel: 'in_app',
        status: 'sent',
        title: 'Inspectra Studio unlocked',
        body: `Plan ${planId} active until ${new Date(expiresAt).toLocaleString()}.`,
        sentAt: new Date(),
        dedupeKey: `studio:${organizationId}:${Date.now()}`,
      },
    });
    return { planId, expiresAt, active: true };
  }

  /**
   * Studio access checkout (weekly / monthly / custom day pass).
   * Without Stripe: grants access immediately for local/dev.
   */
  async purchaseStudioPlan(organizationId: string, dto: CreateStudioCheckoutDto) {
    const plan = getStudioPlan(dto.planId);
    if (!plan) {
      throw new NotFoundException({ code: 'STUDIO_PLAN_NOT_FOUND', message: 'Unknown Studio plan' });
    }
    const days = studioAccessDurationDays(plan, dto.customDays);
    const priceUsd = studioPlanPriceUsd(plan, dto.customDays);

    if (!this.stripe) {
      if (!this.allowLocalBillingGrants()) {
        throw new ServiceUnavailableException({
          code: 'STRIPE_NOT_CONFIGURED',
          message: 'Payments are not configured. Studio packages cannot be purchased right now.',
        });
      }
      const granted = await this.grantStudioAccess(organizationId, plan.id, days);
      return {
        mode: 'local_grant' as const,
        planId: plan.id,
        days,
        expiresAt: granted.expiresAt,
        url: null,
        message: `Stripe not configured — Studio access granted for ${days} day(s) (dev only).`,
      };
    }

    const stripe = this.stripe;
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { billingCustomer: true },
    });

    let customerId = org.billingCustomer?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { organizationId },
      });
      customerId = customer.id;
      await this.prisma.billingCustomer.create({
        data: { organizationId, stripeCustomerId: customerId },
      });
    }

    const envPrice =
      plan.stripePriceEnv && process.env[plan.stripePriceEnv]
        ? process.env[plan.stripePriceEnv]
        : undefined;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = envPrice
      ? [{ price: envPrice, quantity: plan.interval === 'custom' ? days : 1 }]
      : [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: Math.round(priceUsd * 100),
              product_data: {
                name: `Inspectra Studio — ${plan.name}${plan.interval === 'custom' ? ` (${days}d)` : ''}`,
                description: plan.blurb,
              },
            },
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      line_items: lineItems,
      metadata: {
        organizationId,
        planId: plan.id,
        days: String(days),
        kind: 'studio_plan',
      },
    });

    if (!session.url) {
      throw new BadRequestException({ code: 'CHECKOUT_FAILED', message: 'No checkout URL' });
    }

    return {
      mode: 'stripe' as const,
      planId: plan.id,
      sessionId: session.id,
      url: session.url,
      days,
      expiresAt: null,
      message: null,
    };
  }

  private async getSettingsMeta(organizationId: string): Promise<SettingsMeta> {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    return ((settings?.metadata ?? {}) as SettingsMeta) ?? {};
  }

  async getAuditCredits(organizationId: string): Promise<number> {
    const meta = await this.getSettingsMeta(organizationId);
    return Number(meta.auditCredits ?? 0);
  }

  async grantAuditCredits(organizationId: string, amount: number, reason: string) {
    const existing = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    const meta = { ...((existing?.metadata ?? {}) as SettingsMeta) };
    const next = Number(meta.auditCredits ?? 0) + amount;
    meta.auditCredits = next;

    await this.prisma.organizationSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        metadata: meta as Prisma.InputJsonValue,
      },
      update: { metadata: meta as Prisma.InputJsonValue },
    });
    await this.prisma.notification.create({
      data: {
        organizationId,
        channel: 'in_app',
        status: 'sent',
        title: 'Audit credits added',
        body: `+${amount} credits (${reason}). Balance: ${next}. Credits never expire.`,
        sentAt: new Date(),
        dedupeKey: `credits:${organizationId}:${Date.now()}`,
      },
    });
    return { auditCredits: next };
  }

  async userHasUnlimitedAudits(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return isUnlimitedAuditEmail(user?.email);
  }

  /** Consume one credit for a new audit. Unlimited allowlist users skip credits. */
  async consumeAuditCredit(organizationId: string, userId?: string) {
    if (userId && (await this.userHasUnlimitedAudits(userId))) {
      return { auditCredits: null as number | null, unlimited: true as const, freeTrial: false as const };
    }

    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    const meta = { ...((settings?.metadata ?? {}) as SettingsMeta) };
    const credits = Number(meta.auditCredits ?? 0);
    if (credits < 1) {
      throw new BadRequestException({
        code: 'NO_AUDIT_CREDITS',
        message:
          'No audit credits left. Buy a one-time package on Packages, then run another audit.',
      });
    }
    meta.auditCredits = credits - 1;
    await this.prisma.organizationSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        metadata: meta as Prisma.InputJsonValue,
      },
      update: { metadata: meta as Prisma.InputJsonValue },
    });
    return { auditCredits: meta.auditCredits, unlimited: false as const, freeTrial: false as const };
  }

  /** Restore one credit after a failed or cancelled audit (no-op if unlimited). */
  async refundAuditCredit(organizationId: string, userId?: string) {
    if (userId && (await this.userHasUnlimitedAudits(userId))) {
      return { auditCredits: null as number | null, refunded: false as const };
    }
    const existing = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    const meta = { ...((existing?.metadata ?? {}) as SettingsMeta) };
    const next = Number(meta.auditCredits ?? 0) + 1;
    meta.auditCredits = next;
    await this.prisma.organizationSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        metadata: meta as Prisma.InputJsonValue,
      },
      update: { metadata: meta as Prisma.InputJsonValue },
    });
    return { auditCredits: next, refunded: true as const };
  }

  async getSubscription(organizationId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub) {
      return {
        id: 'none',
        status: 'incomplete',
        interval: 'month',
        seatQuantity: 0,
        currentPeriodEnd: new Date().toISOString(),
        cancelAtPeriodEnd: false,
      };
    }
    return {
      id: sub.id,
      status: sub.status,
      interval: sub.interval,
      seatQuantity: sub.seatQuantity,
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    };
  }

  async getEntitlements(organizationId: string, userId?: string) {
    const unlimitedAudits = userId
      ? await this.userHasUnlimitedAudits(userId)
      : false;

    const sub = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        status: { in: ['trialing', 'active'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    const auditCredits = unlimitedAudits
      ? Number.MAX_SAFE_INTEGER
      : Number(((settings?.metadata ?? {}) as SettingsMeta).auditCredits ?? 0);

    if (!sub) {
      return {
        plan: unlimitedAudits ? 'unlimited' : 'payg',
        seatsIncluded: 3,
        auditMinutesIncluded: 60,
        aiTriageEnabled: Boolean(settings?.allowAiTriage ?? true),
        maxConcurrentAudits: unlimitedAudits ? 10 : 2,
        auditCredits,
        unlimitedAudits,
      };
    }

    return {
      plan: unlimitedAudits ? 'unlimited' : sub.stripePriceId,
      seatsIncluded: sub.seatQuantity,
      auditMinutesIncluded: 1000 * sub.seatQuantity,
      aiTriageEnabled: Boolean(settings?.allowAiTriage) || sub.seatQuantity >= 5,
      maxConcurrentAudits: unlimitedAudits ? 10 : Math.max(1, sub.seatQuantity),
      auditCredits,
      unlimitedAudits,
    };
  }

  /**
   * One-time package checkout (no subscription).
   * Without Stripe: grants credits immediately for local/dev.
   */
  async purchasePackage(organizationId: string, dto: CreatePackageCheckoutDto) {
    const pack = getAuditPackage(dto.packageId);
    if (!pack) {
      throw new NotFoundException({ code: 'PACKAGE_NOT_FOUND', message: 'Unknown package' });
    }

    if (!this.stripe) {
      if (!this.allowLocalBillingGrants()) {
        throw new ServiceUnavailableException({
          code: 'STRIPE_NOT_CONFIGURED',
          message: 'Payments are not configured. Audit packages cannot be purchased right now.',
        });
      }
      const balance = await this.grantAuditCredits(
        organizationId,
        pack.audits,
        `${pack.name} pack (local grant — Stripe not configured)`,
      );
      return {
        mode: 'local_grant' as const,
        packageId: pack.id,
        auditsGranted: pack.audits,
        auditCredits: balance.auditCredits,
        url: null,
        message: 'Stripe not configured — credits granted locally for testing (dev only).',
      };
    }

    const stripe = this.stripe;
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { billingCustomer: true },
    });

    let customerId = org.billingCustomer?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { organizationId },
      });
      customerId = customer.id;
      await this.prisma.billingCustomer.create({
        data: { organizationId, stripeCustomerId: customerId },
      });
    }

    const envPrice =
      pack.stripePriceEnv && process.env[pack.stripePriceEnv]
        ? process.env[pack.stripePriceEnv]
        : undefined;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = envPrice
      ? [{ price: envPrice, quantity: 1 }]
      : [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: Math.round(pack.priceUsd * 100),
              product_data: {
                name: `Inspectra ${pack.name} — ${pack.audits} audits`,
                description: 'One-time purchase. Credits never expire. No subscription.',
              },
            },
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      line_items: lineItems,
      metadata: {
        organizationId,
        packageId: pack.id,
        audits: String(pack.audits),
        kind: 'audit_pack',
      },
    });

    if (!session.url) {
      throw new BadRequestException({ code: 'CHECKOUT_FAILED', message: 'No checkout URL' });
    }

    return {
      mode: 'stripe' as const,
      packageId: pack.id,
      sessionId: session.id,
      url: session.url,
      auditsGranted: 0,
      auditCredits: await this.getAuditCredits(organizationId),
      message: null,
    };
  }

  async createCheckoutSession(organizationId: string, dto: CreateCheckoutSessionDto) {
    const stripe = this.requireStripe();
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { billingCustomer: true },
    });

    let customerId = org.billingCustomer?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { organizationId },
      });
      customerId = customer.id;
      await this.prisma.billingCustomer.create({
        data: {
          organizationId,
          stripeCustomerId: customerId,
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      line_items: [
        {
          price: dto.priceId,
          quantity: dto.seatQuantity ?? 1,
        },
      ],
      metadata: { organizationId },
      subscription_data: { metadata: { organizationId } },
    });

    if (!session.url) {
      throw new BadRequestException({ code: 'CHECKOUT_FAILED', message: 'No checkout URL' });
    }

    return { sessionId: session.id, url: session.url };
  }

  async createPortalSession(organizationId: string, dto: BillingPortalDto) {
    const stripe = this.requireStripe();
    const customer = await this.prisma.billingCustomer.findUnique({
      where: { organizationId },
    });
    if (!customer) {
      throw new NotFoundException({
        code: 'NO_CUSTOMER',
        message: 'No billing customer yet',
      });
    }
    const portal = await stripe.billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: dto.returnUrl,
    });
    return { url: portal.url };
  }

  async listUsage(organizationId: string, query: ListUsageQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      organizationId,
      ...(query.metric ? { metric: query.metric as never } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.usageRecord.count({ where }),
      this.prisma.usageRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        metric: r.metric,
        quantity: r.quantity.toString(),
        periodStart: r.periodStart.toISOString(),
        periodEnd: r.periodEnd.toISOString(),
      })),
      meta: toPaginationMeta(page, pageSize, total),
    };
  }

  async usageSummary(organizationId: string, query: UsageSummaryQueryDto) {
    const metric = query.metric ?? 'audit_minutes';
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const records = await this.prisma.usageRecord.findMany({
      where: {
        organizationId,
        metric: metric as never,
        periodStart: { gte: start },
      },
    });
    const total = records.reduce((sum, r) => sum + Number(r.quantity), 0);
    return { metric, periodStart: start.toISOString(), total };
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const stripe = this.requireStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new ServiceUnavailableException({
        code: 'WEBHOOK_SECRET_MISSING',
        message: 'STRIPE_WEBHOOK_SECRET not set',
      });
    }

    const event = stripe.webhooks.constructEvent(payload, signature, secret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (
        session.mode === 'payment' &&
        session.metadata?.kind === 'audit_pack' &&
        session.metadata.organizationId &&
        session.metadata.audits
      ) {
        const audits = Number(session.metadata.audits);
        if (audits > 0) {
          await this.grantAuditCredits(
            session.metadata.organizationId,
            audits,
            `Purchased ${session.metadata.packageId ?? 'pack'}`,
          );
        }
      }

      if (
        session.mode === 'payment' &&
        session.metadata?.kind === 'studio_plan' &&
        session.metadata.organizationId &&
        session.metadata.planId &&
        session.metadata.days
      ) {
        await this.grantStudioAccess(
          session.metadata.organizationId,
          session.metadata.planId,
          Number(session.metadata.days) || 1,
        );
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = subscription.metadata.organizationId;
      if (!organizationId) return { received: true };

      const item = subscription.items.data[0];
      const price = item?.price;
      const periodStart = item?.current_period_start
        ? new Date(item.current_period_start * 1000)
        : new Date();
      const periodEnd = item?.current_period_end
        ? new Date(item.current_period_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await this.prisma.subscription.upsert({
        where: { stripeSubscriptionId: subscription.id },
        create: {
          organizationId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: price?.id ?? 'unknown',
          status: this.mapStatus(subscription.status),
          interval: price?.recurring?.interval === 'year' ? 'year' : 'month',
          seatQuantity: item?.quantity ?? 1,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
        update: {
          status: this.mapStatus(subscription.status),
          seatQuantity: item?.quantity ?? 1,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          stripePriceId: price?.id ?? 'unknown',
        },
      });

      await this.prisma.notification.create({
        data: {
          organizationId,
          channel: 'in_app',
          status: 'sent',
          title: 'Subscription updated',
          body: `Your plan is now ${subscription.status}.`,
          sentAt: new Date(),
          dedupeKey: `sub:${subscription.id}:${subscription.status}:${periodEnd.getTime()}`,
        },
      });
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      await this.prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: 'canceled' },
      });
    }

    return { received: true };
  }

  private mapStatus(
    status: Stripe.Subscription.Status,
  ): 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' {
    switch (status) {
      case 'trialing':
        return 'trialing';
      case 'active':
        return 'active';
      case 'past_due':
        return 'past_due';
      case 'canceled':
        return 'canceled';
      default:
        return 'incomplete';
    }
  }
}
