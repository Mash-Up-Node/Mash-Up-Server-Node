import { oauthProviderEnum } from '../../schema';

export type OAuthProviderName = (typeof oauthProviderEnum.enumValues)[number];

export interface OAuthUserProfile {
  providerUserId: string;
  name?: string;
  email?: string;
}

export interface OAuthProvider {
  readonly providerName: OAuthProviderName;
  getProfile(
    authorizationCode: string,
    state: string,
  ): Promise<OAuthUserProfile>;
}
