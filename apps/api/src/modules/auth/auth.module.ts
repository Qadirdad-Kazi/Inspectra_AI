import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthController } from './oauth.controller';
import { SessionService } from '../../common/services/session.service';
import { resolveJwtSecret } from '../../common/utils/jwt-secret';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: resolveJwtSecret(),
      signOptions: { expiresIn: Number(process.env.JWT_ACCESS_TTL_SEC ?? 3600) },
    }),
  ],
  controllers: [AuthController, OAuthController],
  providers: [AuthService, SessionService],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
