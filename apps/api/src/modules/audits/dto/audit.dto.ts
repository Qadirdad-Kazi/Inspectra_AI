import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateAssetDto {
  @ApiProperty({ enum: ['web', 'android', 'ios', 'msstore', 'api', 'extension', 'saas'] })
  @IsEnum(['web', 'android', 'ios', 'msstore', 'api', 'extension', 'saas'] as const)
  type!: 'web' | 'android' | 'ios' | 'msstore' | 'api' | 'extension' | 'saas';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'https://app.example.com' })
  @IsString()
  @MinLength(1)
  identifier!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiPropertyOptional({ default: 'production' })
  @IsOptional()
  @IsString()
  environment?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class AssetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  identifier!: string;

  @ApiProperty()
  environment!: string;

  @ApiProperty()
  createdAt!: string;
}

export class AuditConfigDto {
  @ApiPropertyOptional({ description: 'Depth / profile name', example: 'standard' })
  @IsOptional()
  @IsString()
  profile?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  includeChecks?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  excludeChecks?: string[];

  @ApiPropertyOptional({ description: 'Max pages to crawl', example: 15 })
  @IsOptional()
  maxPages?: number;

  @ApiPropertyOptional({ description: 'Max link depth', example: 2 })
  @IsOptional()
  maxDepth?: number;

  @ApiPropertyOptional({ description: 'Delay between requests in ms', example: 300 })
  @IsOptional()
  requestDelayMs?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Subset of engines: seo, performance, accessibility, security, best_practices',
  })
  @IsOptional()
  engines?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Store modules: metadata, aso, screenshots, icon, reviews, competitors',
  })
  @IsOptional()
  modules?: string[];

  @ApiPropertyOptional({ description: 'Storefront country code', example: 'us' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Storefront language', example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Competitor package / App Store / MS Store IDs or URLs',
  })
  @IsOptional()
  competitorIds?: string[];

  @ApiPropertyOptional({ description: 'Max reviews to sample', example: 25 })
  @IsOptional()
  maxReviews?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

export class CreateAuditDto {
  @ApiPropertyOptional({ description: 'Existing asset id. Provide assetId, url, or storeIdentifier.' })
  @IsOptional()
  @IsString()
  assetId?: string;

  @ApiPropertyOptional({
    example: 'https://example.com',
    description: 'Website URL — creates/reuses a web asset when assetId omitted',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  url?: string;

  @ApiPropertyOptional({
    enum: ['web', 'android', 'ios', 'msstore'],
    description: 'Target type. Defaults to web when url is provided; required for store audits.',
  })
  @IsOptional()
  @IsEnum(['web', 'android', 'ios', 'msstore'] as const)
  type?: 'web' | 'android' | 'ios' | 'msstore';

  @ApiPropertyOptional({
    example: 'com.spotify.music',
    description:
      'Store package id / App Store numeric id / MS product id / store URL. Used when type is android|ios|msstore.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  storeIdentifier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiPropertyOptional({ type: AuditConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AuditConfigDto)
  config?: AuditConfigDto;
}

export class ListAuditsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['draft', 'pending', 'queued', 'running', 'succeeded', 'failed', 'cancelled', 'timed_out'] })
  @IsOptional()
  @IsEnum(['draft', 'pending', 'queued', 'running', 'succeeded', 'failed', 'cancelled', 'timed_out'] as const)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workspaceId?: string;
}

export class AuditResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  assetId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: Object })
  config!: Record<string, unknown>;

  @ApiPropertyOptional()
  workflowId?: string | null;

  @ApiPropertyOptional()
  startedAt?: string | null;

  @ApiPropertyOptional()
  finishedAt?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class AuditStageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  position!: number;
}

export class AuditEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiPropertyOptional()
  message?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class UpdateFindingTriageDto {
  @ApiProperty({ enum: ['open', 'confirmed', 'false_positive', 'accepted_risk', 'fixed'] })
  @IsEnum(['open', 'confirmed', 'false_positive', 'accepted_risk', 'fixed'] as const)
  triageStatus!: 'open' | 'confirmed' | 'false_positive' | 'accepted_risk' | 'fixed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class FindingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fingerprint!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  severity!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  triageStatus!: string;

  @ApiPropertyOptional()
  location?: string | null;
}

export class ListFindingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['critical', 'high', 'medium', 'low', 'info'] })
  @IsOptional()
  @IsEnum(['critical', 'high', 'medium', 'low', 'info'] as const)
  severity?: string;

  @ApiPropertyOptional({ enum: ['open', 'confirmed', 'false_positive', 'accepted_risk', 'fixed'] })
  @IsOptional()
  @IsEnum(['open', 'confirmed', 'false_positive', 'accepted_risk', 'fixed'] as const)
  triageStatus?: string;
}

export class CreateSuppressionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fingerprint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  reason!: string;
}
