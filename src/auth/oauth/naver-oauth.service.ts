import { Injectable } from '@nestjs/common';
import { NaverAuthFailedException } from '../auth.errors';
import { OAuthProvider, OAuthUserProfile } from './oauth-provider.interface';

type NaverTokenResponse = {
  access_token?: string;
  error?: string;
};

type NaverProfileResponse = {
  resultcode?: string;
  response?: {
    id?: string;
    email?: string;
  };
};

@Injectable()
export class NaverOAuthService implements OAuthProvider {
  readonly providerName = 'NAVER' as const;

  constructor() {
    if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
      throw new Error('NAVER_CLIENT_ID and NAVER_CLIENT_SECRET are required.');
    }
  }

  async getProfile(authorizationCode: string): Promise<OAuthUserProfile> {
    const naverAccessToken = await this.exchangeAccessToken(authorizationCode);
    const profile = await this.fetchProfile(naverAccessToken);
    const providerUserId = profile.response?.id;

    if (!providerUserId) {
      throw new NaverAuthFailedException();
    }

    return {
      providerUserId,
      email: profile.response?.email,
    };
  }

  private async exchangeAccessToken(
    authorizationCode: string,
  ): Promise<string> {
    // 생성자에서 존재 여부를 검증했으므로 non-null assertion 사용
    const clientId = process.env.NAVER_CLIENT_ID!;
    const clientSecret = process.env.NAVER_CLIENT_SECRET!;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
    });

    const response = await this.fetchOrFail(
      `https://nid.naver.com/oauth2.0/token?${params.toString()}`,
    );

    if (!response.ok) {
      throw new NaverAuthFailedException();
    }

    const body = (await response.json()) as NaverTokenResponse;

    if (!body.access_token || body.error) {
      throw new NaverAuthFailedException();
    }

    return body.access_token;
  }

  private async fetchProfile(
    accessToken: string,
  ): Promise<NaverProfileResponse> {
    const response = await this.fetchOrFail(
      'https://openapi.naver.com/v1/nid/me',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new NaverAuthFailedException();
    }

    const body = (await response.json()) as NaverProfileResponse;

    if (body.resultcode !== '00') {
      throw new NaverAuthFailedException();
    }

    return body;
  }

  private async fetchOrFail(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    try {
      return await fetch(input, init);
    } catch {
      throw new NaverAuthFailedException();
    }
  }
}
