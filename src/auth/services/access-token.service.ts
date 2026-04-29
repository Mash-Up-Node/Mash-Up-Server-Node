import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUnauthorizedException } from '../auth.errors';
import { AccessTokenPayload } from '../auth.types';

const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 3600;

@Injectable()
export class AccessTokenService {
  private readonly secret: string;
  private readonly expiresIn: number;

  constructor(private readonly jwtService: JwtService) {
    const secret = process.env.JWT_ACCESS_TOKEN_SECRET;

    if (!secret) {
      throw new Error('JWT_ACCESS_TOKEN_SECRET is required.');
    }

    this.secret = secret;
    this.expiresIn = this.parseTtlSeconds(
      process.env.JWT_ACCESS_TOKEN_TTL_SECONDS,
      DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
    );
  }

  issue(memberId: number, signupCompleted: boolean): string {
    return this.jwtService.sign(
      {
        memberId,
        signupCompleted,
      },
      {
        secret: this.secret,
        expiresIn: this.expiresIn,
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

  private parseTtlSeconds(value: string | undefined, fallback: number): number {
    const ttl = Number(value);

    return Number.isFinite(ttl) && ttl > 0 ? ttl : fallback;
  }
}
