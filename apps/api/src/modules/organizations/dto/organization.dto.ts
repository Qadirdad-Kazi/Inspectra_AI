import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Security' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'acme-security' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiPropertyOptional({ example: 'us' })
  @IsOptional()
  @IsString()
  region?: string;
}

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional({ default: 90 })
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(3650)
  retentionDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowAiTriage?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireMfa?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ssoEnforced?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  allowedEmailDomains?: string[];
}

export class InviteMemberDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ['owner', 'admin', 'analyst', 'viewer'] })
  @IsEnum(['owner', 'admin', 'analyst', 'viewer'] as const)
  role!: 'owner' | 'admin' | 'analyst' | 'viewer';
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ['owner', 'admin', 'analyst', 'viewer'] })
  @IsEnum(['owner', 'admin', 'analyst', 'viewer'] as const)
  role!: 'owner' | 'admin' | 'analyst' | 'viewer';
}

export class CreateWorkspaceDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class OrganizationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  region!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;
}

export class MembershipResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  createdAt!: string;
}

export class InvitationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  expiresAt!: string;
}

export class WorkspaceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  description?: string | null;
}
