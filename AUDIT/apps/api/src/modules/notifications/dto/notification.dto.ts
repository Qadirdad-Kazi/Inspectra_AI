import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListNotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'sent', 'failed', 'read'] })
  @IsOptional()
  @IsEnum(['pending', 'sent', 'failed', 'read'] as const)
  status?: string;

  @ApiPropertyOptional({ enum: ['in_app', 'email', 'webhook', 'slack'] })
  @IsOptional()
  @IsEnum(['in_app', 'email', 'webhook', 'slack'] as const)
  channel?: string;
}

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  channel!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiPropertyOptional()
  readAt?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ enum: ['in_app', 'email', 'webhook', 'slack'] })
  @IsEnum(['in_app', 'email', 'webhook', 'slack'] as const)
  channel!: 'in_app' | 'email' | 'webhook' | 'slack';

  @ApiProperty({ example: 'audit.completed' })
  @IsString()
  eventType!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}

export class NotificationPreferenceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  channel!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  enabled!: boolean;
}

export class MarkReadDto {
  @ApiPropertyOptional({ type: [String], description: 'Omit to mark all as read' })
  @IsOptional()
  @IsString({ each: true })
  notificationIds?: string[];
}
