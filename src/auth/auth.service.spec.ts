import { AuthService } from './auth.service';
import { AuthConflictException } from './auth.errors';

type MemberFixture = {
  id: number;
  oauthProvider: 'NAVER';
  oauthProviderUserId: string;
  email: string | null;
  name: string | null;
  signupCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const memberFixture = (
  overrides: Partial<MemberFixture> = {},
): MemberFixture => ({
  id: 1,
  oauthProvider: 'NAVER',
  oauthProviderUserId: 'naver-id',
  email: 'user@example.com',
  name: null,
  signupCompleted: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

describe('AuthService', () => {
  const naverOAuthService = {
    providerName: 'NAVER' as const,
    getProfile: jest.fn(),
  };
  const accessTokenService = {
    issue: jest.fn(),
  };
  const refreshTokenService = {
    issue: jest.fn(),
  };

  const createService = (createdRows: unknown[], selectedRows: unknown[]) => {
    const db = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoNothing: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue(createdRows),
          }),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(selectedRows),
          }),
        }),
      }),
    };

    return new AuthService(
      db as never,
      naverOAuthService as never,
      accessTokenService as never,
      refreshTokenService as never,
    );
  };

  beforeEach(() => {
    naverOAuthService.getProfile.mockResolvedValue({
      providerUserId: 'naver-id',
      email: 'user@example.com',
    });
    accessTokenService.issue.mockReturnValue('access-token');
    refreshTokenService.issue.mockResolvedValue('refresh-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('신규 OAuth 사용자를 생성하고 access token과 가입 필요 응답을 반환한다', async () => {
    const service = createService([memberFixture()], []);

    await expect(
      service.loginWithNaver('authorization-code', 'WEB'),
    ).resolves.toEqual({
      memberId: 1,
      signupCompleted: false,
      accessToken: 'access-token',
      requiredFields: ['name', 'platform', 'inviteCode'],
    });
    expect(accessTokenService.issue).toHaveBeenCalledWith(1, false);
    expect(refreshTokenService.issue).not.toHaveBeenCalled();
  });

  it('기존 가입 미완료 사용자는 access token과 가입 필요 응답을 반환한다', async () => {
    const service = createService([], [memberFixture()]);

    await expect(
      service.loginWithNaver('authorization-code', 'WEB'),
    ).resolves.toMatchObject({
      memberId: 1,
      signupCompleted: false,
      accessToken: 'access-token',
    });
    expect(refreshTokenService.issue).not.toHaveBeenCalled();
  });

  it('기존 가입 완료 사용자에게 access/refresh token을 발급한다', async () => {
    const service = createService(
      [],
      [memberFixture({ signupCompleted: true, name: 'Mashup' })],
    );

    await expect(
      service.loginWithNaver('authorization-code', 'NATIVE'),
    ).resolves.toEqual({
      memberId: 1,
      signupCompleted: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      authClient: 'NATIVE',
    });
    expect(accessTokenService.issue).toHaveBeenCalledWith(1, true);
    expect(refreshTokenService.issue).toHaveBeenCalledWith(1);
  });

  it('unique 충돌 후 활성 회원을 찾지 못하면 충돌 예외를 던진다', async () => {
    const service = createService([], []);

    await expect(
      service.loginWithNaver('authorization-code', 'WEB'),
    ).rejects.toThrow(AuthConflictException);
  });
});
