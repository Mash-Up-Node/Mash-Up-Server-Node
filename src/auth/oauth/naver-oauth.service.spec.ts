import { NaverAuthFailedException } from '../auth.errors';
import { NaverOAuthService } from './naver-oauth.service';

describe('NaverOAuthService', () => {
  const fetchMock = jest.fn();
  let service: NaverOAuthService;

  beforeEach(() => {
    process.env.NAVER_CLIENT_ID = 'client-id';
    process.env.NAVER_CLIENT_SECRET = 'client-secret';
    global.fetch = fetchMock;
    service = new NaverOAuthService();
  });

  afterEach(() => {
    delete process.env.NAVER_CLIENT_ID;
    delete process.env.NAVER_CLIENT_SECRET;
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

    await expect(service.getProfile('authorization-code')).resolves.toEqual({
      providerUserId: 'naver-id',
      email: 'user@example.com',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('네이버 token API가 실패하면 예외를 던진다', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });

    await expect(service.getProfile('authorization-code')).rejects.toThrow(
      NaverAuthFailedException,
    );
  });

  it('네이버 profile API가 실패하면 예외를 던진다', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'naver-access-token' }),
      })
      .mockResolvedValueOnce({ ok: false });

    await expect(service.getProfile('authorization-code')).rejects.toThrow(
      NaverAuthFailedException,
    );
  });
});
