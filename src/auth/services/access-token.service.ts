import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUnauthorizedException } from '../auth.errors';
import { AccessTokenPayload } from '../auth.types';

@Injectable()
export class AccessTokenService {
  private readonly secret: string;

  constructor(private readonly jwtService: JwtService) {
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;

    if (!secret) {
      throw new Error('JWT_ACCESS_TOKEN_SECRET is required.');
    }

    this.secret = secret;
  }

  issue(memberId: number, signupCompleted: boolean): string {
    const expiresIn = Number(process.env.JWT_ACCESS_TOKEN_TTL_SECONDS ?? 3600);

    return this.jwtService.sign(
      {
        memberId,
        signupCompleted,
      },
      {
        secret: this.secret,
        subject: String(memberId),
        expiresIn,
      },
    );
  }

  verify(token: string): AccessTokenPayload {
    try {
      return this.jwtService.verify<AccessTokenPayload>(token, {
        secret: this.secret,
      });
    } catch {
      throw new AuthUnauthorizedException();
    }
  }
}
