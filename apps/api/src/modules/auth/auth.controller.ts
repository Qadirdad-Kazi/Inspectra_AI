import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  AuthSessionResponseDto,
  ExchangeInvitationDto,
  RefreshSessionDto,
  SignInDto,
  SignUpDto,
} from './dto/auth.dto';
import { CurrentUser, Public } from '../../common/decorators';
import type { AuthPrincipal } from '../../common/types/auth.types';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Register user and optional organization' })
  signUp(@Body() dto: SignUpDto): Promise<AuthSessionResponseDto> {
    return this.authService.signUp(dto);
  }

  @Public()
  @Post('signin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in with password or SSO authorization code' })
  signIn(@Body() dto: SignInDto): Promise<AuthSessionResponseDto> {
    return this.authService.signIn(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshSessionDto): Promise<AuthSessionResponseDto> {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth()
  @Post('signout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke current session' })
  signOut(@CurrentUser() user: AuthPrincipal) {
    return this.authService.signOut(user.sessionId ?? user.userId);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Current authenticated user' })
  me(@CurrentUser() user: AuthPrincipal) {
    return this.authService.me(user.userId);
  }

  @ApiBearerAuth()
  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept organization invitation' })
  acceptInvitation(
    @Body() dto: ExchangeInvitationDto,
    @CurrentUser() user: AuthPrincipal,
  ) {
    return this.authService.acceptInvitation(dto, user.userId);
  }
}
