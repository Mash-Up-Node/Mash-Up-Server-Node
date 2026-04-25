export interface OAuthUserProfile {
  providerUserId: string;
  email?: string;
}

export interface OAuthProvider {
  getProfile(authorizationCode: string): Promise<OAuthUserProfile>;
}
