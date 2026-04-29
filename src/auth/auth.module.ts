import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { MemberRepository } from './member.repository';
import { NaverOAuthService } from './oauth/naver-oauth.service';
import { AccessTokenService } from './services/access-token.service';
import { RefreshTokenService } from './services/refresh-token.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    NaverOAuthService,
    AccessTokenService,
    RefreshTokenService,
    AccessTokenGuard,
    MemberRepository,
  ],
})
export class AuthModule {}
