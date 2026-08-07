import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { BillingService } from './billing.service';
import {
  BillingPortalDto,
  BillingPortalResponseDto,
  CheckoutSessionResponseDto,
  CreateCheckoutSessionDto,
  CreatePackageCheckoutDto,
  CreateStudioCheckoutDto,
  EntitlementsResponseDto,
  ListUsageQueryDto,
  SubscriptionResponseDto,
  UsageRecordResponseDto,
  UsageSummaryQueryDto,
} from './dto/billing.dto';
import { Public, Roles, CurrentUser } from '../../common/decorators';
import { ApiPaginatedOkResponse } from '../../common/dto/pagination.dto';
import type { AuthPrincipal } from '../../common/types/auth.types';

@ApiTags('Billing')
@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Public()
  @Get('billing/packages')
  @ApiOperation({ summary: 'List one-time audit credit packs (no subscription)' })
  listPackages() {
    return this.billingService.listPackages();
  }

  @Public()
  @Get('billing/studio-plans')
  @ApiOperation({ summary: 'List Inspectra Studio access plans (weekly / monthly / custom)' })
  listStudioPlans() {
    return this.billingService.listStudioPlans();
  }

  @ApiBearerAuth()
  @Post('organizations/:organizationId/billing/packages/checkout')
  @Roles('owner')
  @ApiOperation({ summary: 'Buy a one-time audit pack (credits never expire)' })
  purchasePackage(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreatePackageCheckoutDto,
  ) {
    return this.billingService.purchasePackage(organizationId, dto);
  }

  @ApiBearerAuth()
  @Post('organizations/:organizationId/billing/studio/checkout')
  @Roles('viewer')
  @ApiOperation({ summary: 'Buy Inspectra Studio access (weekly / monthly / custom days)' })
  purchaseStudio(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateStudioCheckoutDto,
  ) {
    return this.billingService.purchaseStudioPlan(organizationId, dto);
  }

  @ApiBearerAuth()
  @Get('organizations/:organizationId/billing/subscription')
  @Roles('admin')
  getSubscription(
    @Param('organizationId') organizationId: string,
  ): Promise<SubscriptionResponseDto> {
    return this.billingService.getSubscription(organizationId);
  }

  @ApiBearerAuth()
  @Get('organizations/:organizationId/billing/entitlements')
  @Roles('viewer')
  getEntitlements(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<EntitlementsResponseDto> {
    return this.billingService.getEntitlements(organizationId, user.userId);
  }

  @ApiBearerAuth()
  @Post('organizations/:organizationId/billing/checkout-session')
  @Roles('owner')
  @ApiOperation({ summary: 'Create Stripe Checkout session' })
  createCheckout(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.billingService.createCheckoutSession(organizationId, dto);
  }

  @ApiBearerAuth()
  @Post('organizations/:organizationId/billing/portal-session')
  @Roles('owner')
  createPortal(
    @Param('organizationId') organizationId: string,
    @Body() dto: BillingPortalDto,
  ): Promise<BillingPortalResponseDto> {
    return this.billingService.createPortalSession(organizationId, dto);
  }

  @ApiBearerAuth()
  @Get('organizations/:organizationId/billing/usage')
  @Roles('admin')
  @ApiPaginatedOkResponse(UsageRecordResponseDto)
  listUsage(
    @Param('organizationId') organizationId: string,
    @Query() query: ListUsageQueryDto,
  ) {
    return this.billingService.listUsage(organizationId, query);
  }

  @ApiBearerAuth()
  @Get('organizations/:organizationId/billing/usage/summary')
  @Roles('admin')
  usageSummary(
    @Param('organizationId') organizationId: string,
    @Query() query: UsageSummaryQueryDto,
  ) {
    return this.billingService.usageSummary(organizationId, query);
  }

  @Public()
  @Post('webhooks/stripe')
  @ApiExcludeEndpoint()
  stripeWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['stripe-signature'] as string;
    return this.billingService.handleStripeWebhook(req.rawBody as Buffer, signature);
  }
}
