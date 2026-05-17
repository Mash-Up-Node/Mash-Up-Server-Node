import { Injectable, Logger } from '@nestjs/common';
import { AuthClient } from '../auth.types';
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

const NAVER_SUCCESS_RESULT_CODE = '00';
const NAVER_FETCH_TIMEOUT_MS = 5000;

type NaverApiStage = 'token' | 'profile';

@Injectable()
export class NaverOAuthService implements OAuthProvider {
  readonly providerName = 'NAVER' as const;
  private readonly logger = new Logger(NaverOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webRedirectUri: string;
  private readonly nativeRedirectUri: string;

  constructor() {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    const webRedirectUri = process.env.NAVER_WEB_REDIRECT_URI;
    const nativeRedirectUri = process.env.NAVER_NATIVE_REDIRECT_URI;

    if (!clientId || !clientSecret || !webRedirectUri) {
      throw new Error(
        'NAVER_CLIENT_ID, NAVER_CLIENT_SECRET and NAVER_WEB_REDIRECT_URI are required.',
      );
    }

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.webRedirectUri = webRedirectUri;
    this.nativeRedirectUri = nativeRedirectUri || webRedirectUri;
  }

  async getProfile(
    authorizationCode: string,
    state: string,
    authClient: AuthClient,
  ): Promise<OAuthUserProfile> {
    const naverAccessToken = await this.exchangeAccessToken(
      authorizationCode,
      state,
      authClient,
    );
    const profile = await this.fetchProfile(naverAccessToken);
    const providerUserId = profile.response?.id;

    if (!providerUserId) {
      this.logger.warn('Naver profile response missing provider user id');
      throw new NaverAuthFailedException();
    }

    return {
      providerUserId,
      email: profile.response?.email,
    };
  }

  private async exchangeAccessToken(
    authorizationCode: string,
    state: string,
    authClient: AuthClient,
  ): Promise<string> {
    const redirectUri =
      authClient === 'NATIVE' ? this.nativeRedirectUri : this.webRedirectUri;
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      code: authorizationCode,
      state,
    });

    const response = await this.fetchOrFail(
      'token',
      `https://nid.naver.com/oauth2.0/token?${params.toString()}`,
    );

    if (!response.ok) {
      this.logger.warn(`Naver token API failed: status=${response.status}`);
      throw new NaverAuthFailedException();
    }

    const body = await this.readJson<NaverTokenResponse>('token', response);

    if (!body.access_token || body.error) {
      this.logger.warn(
        `Naver token API returned invalid body: error=${body.error ?? 'missing_access_token'}`,
      );
      throw new NaverAuthFailedException();
    }

    return body.access_token;
  }

  private async fetchProfile(
    accessToken: string,
  ): Promise<NaverProfileResponse> {
    const response = await this.fetchOrFail(
      'profile',
      'https://openapi.naver.com/v1/nid/me',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      this.logger.warn(`Naver profile API failed: status=${response.status}`);
      throw new NaverAuthFailedException();
    }

    const body = await this.readJson<NaverProfileResponse>('profile', response);

    if (body.resultcode !== NAVER_SUCCESS_RESULT_CODE) {
      this.logger.warn(
        `Naver profile API returned failure resultcode: resultcode=${body.resultcode ?? 'missing'}`,
      );
      throw new NaverAuthFailedException();
    }

    return body;
  }

  private async fetchOrFail(
    stage: NaverApiStage,
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      NAVER_FETCH_TIMEOUT_MS,
    );
    timeout.unref();

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Naver ${stage} API request failed: ${message}`);
      throw new NaverAuthFailedException();
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readJson<T>(
    stage: NaverApiStage,
    response: Response,
  ): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Naver ${stage} API response JSON parse failed: ${message}`,
      );
      throw new NaverAuthFailedException();
    }
  }
}
