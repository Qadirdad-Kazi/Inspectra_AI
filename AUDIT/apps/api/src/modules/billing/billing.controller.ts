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
  EntitlementsResponseDto,
  ListUsageQueryDto,
  SubscriptionResponseDto,
  UsageRecordResponseDto,
  UsageSummaryQueryDto,
} from './dto/billing.dto';
import { Public, Roles } from '../../common/decorators';
import { ApiPaginatedOkResponse } from '../../common/dto/pagination.dto';

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
  ): Promise<EntitlementsResponseDto> {
    return this.billingService.getEntitlements(organizationId);
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
