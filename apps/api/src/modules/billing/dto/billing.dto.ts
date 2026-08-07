import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateCheckoutSessionDto {
  @ApiProperty({ description: 'Stripe price id' })
  @IsString()
  priceId!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatQuantity?: number;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  successUrl!: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}

export class CheckoutSessionResponseDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  url!: string;
}

export class BillingPortalDto {
  @ApiProperty()
  @IsUrl({ require_tld: false })
  returnUrl!: string;
}

export class BillingPortalResponseDto {
  @ApiProperty()
  url!: string;
}

export class SubscriptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  interval!: string;

  @ApiProperty()
  seatQuantity!: number;

  @ApiProperty()
  currentPeriodEnd!: string;

  @ApiProperty()
  cancelAtPeriodEnd!: boolean;
}

export class UsageSummaryQueryDto {
  @ApiPropertyOptional({ enum: ['audit_minutes', 'seats', 'ai_tokens', 'report_exports'] })
  @IsOptional()
  @IsEnum(['audit_minutes', 'seats', 'ai_tokens', 'report_exports'] as const)
  metric?: string;
}

export class UsageRecordResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  metric!: string;

  @ApiProperty()
  quantity!: string;

  @ApiProperty()
  periodStart!: string;

  @ApiProperty()
  periodEnd!: string;
}

export class ListUsageQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['audit_minutes', 'seats', 'ai_tokens', 'report_exports'] })
  @IsOptional()
  @IsEnum(['audit_minutes', 'seats', 'ai_tokens', 'report_exports'] as const)
  metric?: string;
}

export class CreatePackageCheckoutDto {
  @ApiProperty({ description: 'Package id: starter | growth | pro' })
  @IsString()
  packageId!: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  successUrl!: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}

export class CreateStudioCheckoutDto {
  @ApiProperty({ description: 'studio-weekly | studio-monthly | studio-custom' })
  @IsString()
  planId!: string;

  @ApiPropertyOptional({ description: 'Days for studio-custom (1–14)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customDays?: number;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  successUrl!: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}

export class EntitlementsResponseDto {
  @ApiProperty()
  plan!: string;

  @ApiProperty()
  seatsIncluded!: number;

  @ApiProperty()
  auditMinutesIncluded!: number;

  @ApiProperty()
  aiTriageEnabled!: boolean;

  @ApiProperty()
  maxConcurrentAudits!: number;

  @ApiProperty({ description: 'One-time audit credits remaining (never expire)' })
  auditCredits!: number;

  @ApiProperty({ description: 'When true, audits are not limited by credits' })
  unlimitedAudits!: boolean;
}
