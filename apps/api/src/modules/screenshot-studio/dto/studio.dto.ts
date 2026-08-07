import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateScreenshotProjectDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assetId?: string;

  @ApiPropertyOptional({ enum: ['ios', 'android', 'msstore', 'web'] })
  @IsOptional()
  @IsIn(['ios', 'android', 'msstore', 'web'])
  platform?: 'ios' | 'android' | 'msstore' | 'web';

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  canvasConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  exportSettings?: Record<string, unknown>;
}

export class UpdateScreenshotProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ enum: ['ios', 'android', 'msstore', 'web'] })
  @IsOptional()
  @IsIn(['ios', 'android', 'msstore', 'web'])
  platform?: 'ios' | 'android' | 'msstore' | 'web';

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  canvasConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  exportSettings?: Record<string, unknown>;
}

export class AiGenerateScreenshotsDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  appName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  appDescription?: string;

  @ApiProperty({ enum: ['ios', 'android', 'msstore', 'web'] })
  @IsIn(['ios', 'android', 'msstore', 'web'])
  targetPlatform!: 'ios' | 'android' | 'msstore' | 'web';

  @ApiPropertyOptional({ enum: ['dark', 'glassmorphism', 'gradient', 'minimal'] })
  @IsOptional()
  @IsIn(['dark', 'glassmorphism', 'gradient', 'minimal'])
  theme?: 'dark' | 'glassmorphism' | 'gradient' | 'minimal';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rawScreenshotUrls?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  auditFindingsSummary?: string[];
}
