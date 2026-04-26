import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodValidationPipe } from '../common/pipes';
import { AuthenticatedRequest } from './auth.types';
import { AuthService } from './auth.service';
import { naverLoginSchema, NaverLoginDto } from './dto/naver-login.dto';
import { AccessTokenGuard } from './guards/access-token.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(200)
  @Post('naver/login')
  async loginWithNaver(
    @Body(new ZodValidationPipe(naverLoginSchema)) body: NaverLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginWithNaver(
      body.authorizationCode,
      body.authClient,
    );

    // WEB 클라이언트는 refresh token을 HttpOnly 쿠키로 전달해 XSS 노출을 방지한다.
    // NATIVE 클라이언트는 쿠키를 사용할 수 없으므로 body에 포함한다.
    if (result.signupCompleted && body.authClient === 'WEB') {
      const ttl = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 1209600);
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: ttl * 1000,
        path: '/auth',
      });
      return {
        memberId: result.memberId,
        signupCompleted: result.signupCompleted,
        accessToken: result.accessToken,
        authClient: result.authClient,
      };
    }

    return result;
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  getMe(@Req() request: AuthenticatedRequest) {
    return this.authService.getMe(request.member);
  }
}
