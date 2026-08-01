import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { CollaborationService } from './collaboration.service';
import { CurrentUser, Roles } from '../../common/decorators';
import type { AuthPrincipal } from '../../common/types/auth.types';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;
}

@ApiTags('Collaboration')
@ApiBearerAuth()
@Controller('organizations/:organizationId/audits/:auditId/comments')
export class CollaborationController {
  constructor(private readonly collaboration: CollaborationService) {}

  @Get()
  @Roles('viewer')
  list(
    @Param('organizationId') organizationId: string,
    @Param('auditId') auditId: string,
  ) {
    return this.collaboration.listComments(organizationId, auditId);
  }

  @Post()
  @Roles('viewer')
  create(
    @Param('organizationId') organizationId: string,
    @Param('auditId') auditId: string,
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: CreateCommentDto,
  ) {
    return this.collaboration.addComment(
      organizationId,
      auditId,
      user.userId,
      dto.body,
      dto.parentId,
    );
  }
}
