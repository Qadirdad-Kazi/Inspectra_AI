import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  ListNotificationsQueryDto,
  MarkReadDto,
  NotificationPreferenceResponseDto,
  NotificationResponseDto,
  UpdateNotificationPreferenceDto,
} from './dto/notification.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import type { AuthPrincipal } from '../../common/types/auth.types';
import { ApiPaginatedOkResponse } from '../../common/dto/pagination.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('organizations/:organizationId/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles('viewer')
  @ApiPaginatedOkResponse(NotificationResponseDto)
  list(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthPrincipal,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.list(organizationId, user.userId, query);
  }

  @Post('read')
  @Roles('viewer')
  markRead(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: MarkReadDto,
  ) {
    return this.notificationsService.markRead(organizationId, user.userId, dto);
  }

  @Get('preferences')
  @Roles('viewer')
  @ApiPaginatedOkResponse(NotificationPreferenceResponseDto)
  listPreferences(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthPrincipal,
  ) {
    return this.notificationsService.listPreferences(organizationId, user.userId);
  }

  @Patch('preferences')
  @Roles('viewer')
  upsertPreference(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.upsertPreference(
      organizationId,
      user.userId,
      dto,
    );
  }
}
