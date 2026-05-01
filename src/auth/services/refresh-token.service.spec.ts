import { createHash } from 'crypto';
import { RefreshTokenService } from './refresh-token.service';

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

describe('RefreshTokenService', () => {
  const redisClient = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  let service: RefreshTokenService;

  beforeEach(() => {
    process.env.REFRESH_TOKEN_TTL_SECONDS = '1209600';
    redisClient.set.mockResolvedValue('OK');
    redisClient.get.mockReset();
    redisClient.del.mockReset();
    service = new RefreshTokenService(redisClient as never);
  });

  afterEach(() => {
    delete process.env.REFRESH_TOKEN_TTL_SECONDS;
    jest.clearAllMocks();
  });

  it('refresh token을 발급하고 hash를 Redis에 TTL과 함께 저장한다', async () => {
    const refreshToken = await service.issue(1);
    const [key, value, mode, ttl] = redisClient.set.mock.calls[0];

    expect(refreshToken.split('.')).toHaveLength(2);
    expect(key).toMatch(/^auth:refresh:/);
    expect(JSON.parse(value)).toMatchObject({
      memberId: 1,
      tokenHash: hashToken(refreshToken),
    });
    expect(mode).toBe('EX');
    expect(ttl).toBe(1209600);
  });

  it('tokenId로 저장된 refresh token 정보를 조회한다', async () => {
    redisClient.get.mockResolvedValue(
      JSON.stringify({ memberId: 1, tokenHash: 'hash' }),
    );

    await expect(service.findByTokenId('token-id')).resolves.toEqual({
      memberId: 1,
      tokenHash: 'hash',
    });
  });
});
