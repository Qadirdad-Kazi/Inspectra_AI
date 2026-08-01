import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiKeysService } from './api-keys.service';
import { Roles } from '../../common/decorators';

export class CreateApiKeyDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  scopes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('organizations/:organizationId/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  @Roles('admin')
  list(@Param('organizationId') organizationId: string) {
    return this.apiKeys.list(organizationId);
  }

  @Post()
  @Roles('admin')
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeys.create(organizationId, dto);
  }

  @Delete(':apiKeyId')
  @Roles('admin')
  revoke(
    @Param('organizationId') organizationId: string,
    @Param('apiKeyId') apiKeyId: string,
  ) {
    return this.apiKeys.revoke(organizationId, apiKeyId);
  }
}
