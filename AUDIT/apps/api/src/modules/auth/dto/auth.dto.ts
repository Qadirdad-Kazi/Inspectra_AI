import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class SignUpDto {
  @ApiProperty({ example: 'ada@inspectra.ai' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ description: 'Required when AUTH_PROVIDER=password' })
  @IsOptional()
  @IsString()
  @MinLength(12)
  password?: string;

  @ApiPropertyOptional({ description: 'Org name to create on signup' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  organizationName?: string;
}

export class SignInDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'IdP authorization code (SSO)' })
  @IsOptional()
  @IsString()
  authorizationCode?: string;
}

export class RefreshSessionDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class AuthTokensDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  expiresIn!: number;

  @ApiProperty({ enum: ['Bearer'] })
  tokenType!: 'Bearer';
}

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  name?: string | null;
}

export class AuthSessionResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ type: AuthTokensDto })
  tokens!: AuthTokensDto;
}

export class ExchangeInvitationDto {
  @ApiProperty()
  @IsString()
  token!: string;
}
