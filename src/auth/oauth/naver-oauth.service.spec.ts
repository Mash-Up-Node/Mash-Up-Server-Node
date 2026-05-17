import { NaverAuthFailedException } from '../auth.errors';
import { NaverOAuthService } from './naver-oauth.service';

describe('NaverOAuthService', () => {
  const fetchMock = jest.fn();
  let service: NaverOAuthService;

  beforeEach(() => {
    process.env.NAVER_CLIENT_ID = 'client-id';
    process.env.NAVER_CLIENT_SECRET = 'client-secret';
    process.env.NAVER_WEB_REDIRECT_URI = 'https://example.com/oauth/naver';
    global.fetch = fetchMock;
    service = new NaverOAuthService();
  });

  afterEach(() => {
    delete process.env.NAVER_CLIENT_ID;
    delete process.env.NAVER_CLIENT_SECRET;
    delete process.env.NAVER_WEB_REDIRECT_URI;
    jest.restoreAllMocks();
    fetchMock.mockReset();
  });

  it('네이버 token/profile API로 OAuth 프로필을 조회한다', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'naver-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resultcode: '00',
          response: { id: 'naver-id', email: 'user@example.com' },
        }),
      });

    await expect(
      service.getProfile('authorization-code', 'oauth-state', 'WEB'),
    ).resolves.toEqual({
      providerUserId: 'naver-id',
      email: 'user@example.com',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const tokenUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(tokenUrl.searchParams.get('grant_type')).toBe('authorization_code');
    expect(tokenUrl.searchParams.get('client_id')).toBe('client-id');
    expect(tokenUrl.searchParams.get('client_secret')).toBe('client-secret');
    expect(tokenUrl.searchParams.get('redirect_uri')).toBe(
      'https://example.com/oauth/naver',
    );
    expect(tokenUrl.searchParams.get('code')).toBe('authorization-code');
    expect(tokenUrl.searchParams.get('state')).toBe('oauth-state');
  });

  it('NATIVE 클라이언트는 전용 redirect URI가 있으면 토큰 교환에 사용한다', async () => {
    process.env.NAVER_NATIVE_REDIRECT_URI = 'mashup://oauth/naver';
    service = new NaverOAuthService();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'naver-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resultcode: '00',
          response: { id: 'naver-id', email: 'user@example.com' },
        }),
      });

    await expect(
      service.getProfile('authorization-code', 'oauth-state', 'NATIVE'),
    ).resolves.toMatchObject({
      providerUserId: 'naver-id',
    });

    const tokenUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(tokenUrl.searchParams.get('redirect_uri')).toBe(
      'mashup://oauth/naver',
    );
  });

  it('네이버 token API가 실패하면 예외를 던진다', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });

    await expect(
      service.getProfile('authorization-code', 'oauth-state', 'WEB'),
    ).rejects.toThrow(NaverAuthFailedException);
  });

  it('네이버 profile API가 실패하면 예외를 던진다', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'naver-access-token' }),
      })
      .mockResolvedValueOnce({ ok: false });

    await expect(
      service.getProfile('authorization-code', 'oauth-state', 'WEB'),
    ).rejects.toThrow(NaverAuthFailedException);
  });
});
