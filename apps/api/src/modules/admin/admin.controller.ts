import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CurrentUser } from '../../common/decorators';
import type { AuthPrincipal } from '../../common/types/auth.types';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class UpdateUserAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPlatformAdmin?: boolean;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(PlatformAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide SaaS metrics' })
  stats(@CurrentUser() _user: AuthPrincipal) {
    return this.adminService.stats();
  }

  @Get('users')
  listUsers(@Query() query: PaginationQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Patch('users/:userId')
  updateUser(@Param('userId') userId: string, @Body() dto: UpdateUserAdminDto) {
    return this.adminService.updateUser(userId, dto);
  }

  @Get('organizations')
  listOrganizations(@Query() query: PaginationQueryDto) {
    return this.adminService.listOrganizations(query);
  }
}
