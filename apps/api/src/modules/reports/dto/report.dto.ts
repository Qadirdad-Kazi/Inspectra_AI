import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateReportDto {
  @ApiProperty()
  @IsString()
  auditId!: string;

  @ApiProperty({ enum: ['pdf', 'sarif', 'json', 'csv', 'html'] })
  @IsEnum(['pdf', 'sarif', 'json', 'csv', 'html'] as const)
  format!: 'pdf' | 'sarif' | 'json' | 'csv' | 'html';

  @ApiPropertyOptional({ example: 'Executive summary — Q3' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;
}

export class ListReportsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'generating', 'ready', 'failed'] })
  @IsOptional()
  @IsEnum(['pending', 'generating', 'ready', 'failed'] as const)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  auditId?: string;
}

export class ReportResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  auditId!: string;

  @ApiProperty()
  format!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  downloadUrl?: string | null;

  @ApiPropertyOptional()
  readyAt?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class ReportDownloadResponseDto {
  @ApiProperty()
  reportId!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  expiresAt!: string;
}
