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
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ZodValidationPipe } from '../common/pipes';
import { AuthenticatedRequest } from './auth.types';
import { AuthService } from './auth.service';
import { naverLoginSchema, NaverLoginDto } from './dto/naver-login.dto';
import { AccessTokenGuard } from './guards/access-token.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: '네이버 OAuth 로그인',
    description:
      '네이버 authorization code로 회원을 식별한다. 가입 완료 WEB 클라이언트의 refresh token은 HttpOnly cookie로 전달한다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['authorizationCode'],
      properties: {
        authorizationCode: {
          type: 'string',
          example: 'naver-authorization-code',
        },
        authClient: {
          type: 'string',
          enum: ['WEB', 'NATIVE'],
          default: 'WEB',
          example: 'WEB',
        },
      },
    },
  })
  @ApiOkResponse({
    description:
      '가입 미완료 사용자는 access token만 받고, 가입 완료 사용자는 클라이언트 유형에 따라 refresh token을 cookie 또는 body로 받는다.',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                memberId: { type: 'number', example: 1 },
                signupCompleted: { type: 'boolean', example: false },
                accessToken: { type: 'string', example: 'access-token' },
                requiredFields: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['name', 'platform', 'inviteCode'],
                },
              },
            },
          },
        },
        {
          type: 'object',
          description:
            'WEB 클라이언트 가입 완료 응답. refresh token은 refresh_token HttpOnly cookie로 전달된다.',
          properties: {
            data: {
              type: 'object',
              properties: {
                memberId: { type: 'number', example: 1 },
                signupCompleted: { type: 'boolean', example: true },
                accessToken: { type: 'string', example: 'access-token' },
                authClient: { type: 'string', example: 'WEB' },
              },
            },
          },
        },
        {
          type: 'object',
          description: 'NATIVE 클라이언트 가입 완료 응답.',
          properties: {
            data: {
              type: 'object',
              properties: {
                memberId: { type: 'number', example: 1 },
                signupCompleted: { type: 'boolean', example: true },
                accessToken: { type: 'string', example: 'access-token' },
                refreshToken: { type: 'string', example: 'refresh-token' },
                authClient: { type: 'string', example: 'NATIVE' },
              },
            },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({ description: '요청값 형식 오류' })
  @ApiBadGatewayResponse({ description: '네이버 인증 실패' })
  @HttpCode(200)
  @Post('naver/login')
  async loginWithNaver(
    @Body(new ZodValidationPipe(naverLoginSchema)) body: NaverLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginWithNaver(
      body.authorizationCode,
      body.state,
      body.authClient,
    );

    // WEB 클라이언트는 refresh token을 HttpOnly 쿠키로 전달해 XSS 노출을 방지한다.
    // NATIVE 클라이언트는 쿠키를 사용할 수 없으므로 body에 포함한다.
    if (result.signupCompleted && body.authClient === 'WEB') {
      const ttl = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 1209600);
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: ttl * 1000,
        path: '/',
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

  @ApiOperation({ summary: '내 인증 정보 조회' })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Bearer access token 기반 인증 회원 정보',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            memberId: { type: 'number', example: 1 },
            authenticated: { type: 'boolean', example: true },
            signupCompleted: { type: 'boolean', example: true },
            name: { type: 'string', nullable: true, example: '홍길동' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '인증 정보가 유효하지 않음' })
  @Get('me')
  @UseGuards(AccessTokenGuard)
  getMe(@Req() request: AuthenticatedRequest) {
    return this.authService.getMe(request.member);
  }
}
