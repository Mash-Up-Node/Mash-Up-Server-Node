import { naverLoginSchema } from './naver-login.dto';

describe('naverLoginSchema', () => {
  it('authorizationCode, state, authClient를 검증한다', () => {
    const result = naverLoginSchema.safeParse({
      authorizationCode: 'authorization-code',
      state: 'oauth-state',
      authClient: 'NATIVE',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        authorizationCode: 'authorization-code',
        state: 'oauth-state',
        authClient: 'NATIVE',
      });
    }
  });

  it('authClient가 없으면 WEB으로 기본값을 채운다', () => {
    const result = naverLoginSchema.safeParse({
      authorizationCode: 'authorization-code',
      state: 'oauth-state',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.authClient).toBe('WEB');
    }
  });

  it('state가 없거나 빈 문자열이면 실패한다', () => {
    expect(
      naverLoginSchema.safeParse({
        authorizationCode: 'authorization-code',
        authClient: 'WEB',
      }).success,
    ).toBe(false);
    expect(
      naverLoginSchema.safeParse({
        authorizationCode: 'authorization-code',
        state: '   ',
        authClient: 'WEB',
      }).success,
    ).toBe(false);
  });

  it('state 값은 trim하지 않고 그대로 보존한다', () => {
    const result = naverLoginSchema.safeParse({
      authorizationCode: 'authorization-code',
      state: ' oauth-state ',
      authClient: 'WEB',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe(' oauth-state ');
    }
  });
});
