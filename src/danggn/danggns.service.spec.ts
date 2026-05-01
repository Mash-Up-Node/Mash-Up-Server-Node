import { Test, TestingModule } from '@nestjs/testing';
import { DanggnsService } from './danggns.service';
import { DanggnsRepository } from './danggns.repository';
import { RankingRepository } from './ranking.repository';
import { DanggnsCacheRepository } from './danggns-cache.repository';
import { DanggnsException } from './danggns.exception';

const MOCK_ROUND = {
  id: 1,
  generationId: 1,
  roundNo: 1,
  startedAt: new Date('2020-01-01'),
  endedAt: new Date('2099-01-01'),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('DanggnsService', () => {
  let service: DanggnsService;
  let danggnsRepository: jest.Mocked<DanggnsRepository>;
  let rankingRepository: jest.Mocked<RankingRepository>;
  let danggnsCacheRepository: jest.Mocked<DanggnsCacheRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DanggnsService,
        {
          provide: DanggnsRepository,
          useValue: {
            findRoundById: jest.fn(),
            insertShakeEvent: jest.fn(),
          },
        },
        {
          provide: RankingRepository,
          useValue: {
            zIncrBy: jest.fn(),
          },
        },
        {
          provide: DanggnsCacheRepository,
          useValue: {
            getLastSentAt: jest.fn(),
            setLastSentAt: jest.fn(),
            exists: jest.fn(),
            getFeverCooltimeRemaining: jest.fn(),
            setFever: jest.fn(),
            setFeverCooltime: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(DanggnsService);
    danggnsRepository = module.get(DanggnsRepository);
    rankingRepository = module.get(RankingRepository);
    danggnsCacheRepository = module.get(DanggnsCacheRepository);

    danggnsRepository.findRoundById.mockResolvedValue(MOCK_ROUND);
    danggnsRepository.insertShakeEvent.mockResolvedValue(undefined as any);
    rankingRepository.zIncrBy.mockResolvedValue('100');
    danggnsCacheRepository.getLastSentAt.mockResolvedValue(null);
    danggnsCacheRepository.setLastSentAt.mockResolvedValue(undefined);
    danggnsCacheRepository.exists.mockResolvedValue(false);
    danggnsCacheRepository.getFeverCooltimeRemaining.mockResolvedValue(0);
    danggnsCacheRepository.setFever.mockResolvedValue(undefined);
    danggnsCacheRepository.setFeverCooltime.mockResolvedValue(undefined);
  });

  describe('handleShake', () => {
    const ROUND_ID = 1;
    const SHAKE_COUNT = 10;
    const SENT_AT = new Date().toISOString();

    describe('정상 처리', () => {
      it('일반 흔들기 - appliedScore가 shakeCount와 동일하고 isFeverApplied가 false다', async () => {
        const result = await service.handleShake(
          ROUND_ID,
          SHAKE_COUNT,
          SENT_AT,
          false,
        );

        expect(result).toEqual({
          appliedScore: SHAKE_COUNT,
          currentRoundScore: 100,
          currentCrewScore: 100,
          isFeverApplied: false,
        });
      });

      it('피버 흔들기 - appliedScore가 shakeCount * 10이고 isFeverApplied가 true다', async () => {
        danggnsCacheRepository.exists.mockResolvedValue(true);

        const result = await service.handleShake(
          ROUND_ID,
          SHAKE_COUNT,
          SENT_AT,
          true,
        );

        expect(result).toEqual({
          appliedScore: SHAKE_COUNT * 10,
          currentRoundScore: 100,
          currentCrewScore: 100,
          isFeverApplied: true,
        });
      });

      it('성공 후 setLastSentAt을 호출한다', async () => {
        await service.handleShake(ROUND_ID, SHAKE_COUNT, SENT_AT, false);

        expect(danggnsCacheRepository.setLastSentAt).toHaveBeenCalledWith(
          1,
          expect.any(Number),
        );
      });

      it('lastSentAt이 null이면 물리적 속도 체크를 스킵하고 성공한다', async () => {
        danggnsCacheRepository.getLastSentAt.mockResolvedValue(null);

        await expect(
          service.handleShake(ROUND_ID, 1500, SENT_AT, false),
        ).resolves.toMatchObject({ appliedScore: 1500 });
      });
    });

    describe('라운드 검증', () => {
      it('라운드가 없으면 ROUND_NOT_FOUND 예외를 던진다', async () => {
        danggnsRepository.findRoundById.mockResolvedValue(undefined);

        const err = await service
          .handleShake(ROUND_ID, SHAKE_COUNT, SENT_AT, false)
          .catch((e) => e);

        expect(err).toBeInstanceOf(DanggnsException);
        expect(err.getResponse()).toMatchObject({
          errorCode: 'ROUND_NOT_FOUND',
        });
      });

      it('sentAt이 라운드 시작 전이면 ROUND_CLOSED 예외를 던진다', async () => {
        const beforeRoundStart = new Date('2019-06-01').toISOString();

        const err = await service
          .handleShake(ROUND_ID, SHAKE_COUNT, beforeRoundStart, false)
          .catch((e) => e);

        expect(err).toBeInstanceOf(DanggnsException);
        expect(err.getResponse()).toMatchObject({ errorCode: 'ROUND_CLOSED' });
      });

      it('sentAt이 라운드 종료 후면 ROUND_CLOSED 예외를 던진다', async () => {
        const afterRoundEnd = new Date('2100-01-01').toISOString();

        const err = await service
          .handleShake(ROUND_ID, SHAKE_COUNT, afterRoundEnd, false)
          .catch((e) => e);

        expect(err).toBeInstanceOf(DanggnsException);
        expect(err.getResponse()).toMatchObject({ errorCode: 'ROUND_CLOSED' });
      });
    });

    describe('어뷰징 검증', () => {
      it('shakeCount가 0이면 ABNORMAL_SHAKE_COUNT 예외를 던진다', async () => {
        const err = await service
          .handleShake(ROUND_ID, 0, SENT_AT, false)
          .catch((e) => e);

        expect(err).toBeInstanceOf(DanggnsException);
        expect(err.getResponse()).toMatchObject({
          errorCode: 'ABNORMAL_SHAKE_COUNT',
        });
      });

      it('shakeCount가 1500을 초과하면 ABNORMAL_SHAKE_COUNT 예외를 던진다', async () => {
        const err = await service
          .handleShake(ROUND_ID, 1501, SENT_AT, false)
          .catch((e) => e);

        expect(err).toBeInstanceOf(DanggnsException);
        expect(err.getResponse()).toMatchObject({
          errorCode: 'ABNORMAL_SHAKE_COUNT',
        });
      });

      it('sentAt이 현재 시각보다 5초 이상 미래면 ABNORMAL_SHAKE_COUNT 예외를 던진다', async () => {
        const futureSentAt = new Date(Date.now() + 10_000).toISOString();

        const err = await service
          .handleShake(ROUND_ID, SHAKE_COUNT, futureSentAt, false)
          .catch((e) => e);

        expect(err).toBeInstanceOf(DanggnsException);
        expect(err.getResponse()).toMatchObject({
          errorCode: 'ABNORMAL_SHAKE_COUNT',
        });
      });

      it('lastSentAt 기준 물리적 속도를 초과하면 ABNORMAL_SHAKE_COUNT 예외를 던진다', async () => {
        // 직전 요청이 방금 있었으므로 elapsed ≈ 0 → 1초로 클램프 → 최대 20회
        danggnsCacheRepository.getLastSentAt.mockResolvedValue(Date.now());

        const err = await service
          .handleShake(ROUND_ID, 100, SENT_AT, false)
          .catch((e) => e);

        expect(err).toBeInstanceOf(DanggnsException);
        expect(err.getResponse()).toMatchObject({
          errorCode: 'ABNORMAL_SHAKE_COUNT',
        });
      });
    });

    describe('피버 검증', () => {
      it('isFever가 true인데 피버 키가 없으면 FEVER_NOT_ACTIVE 예외를 던진다', async () => {
        danggnsCacheRepository.exists.mockResolvedValue(false);

        const err = await service
          .handleShake(ROUND_ID, SHAKE_COUNT, SENT_AT, true)
          .catch((e) => e);

        expect(err).toBeInstanceOf(DanggnsException);
        expect(err.getResponse()).toMatchObject({
          errorCode: 'FEVER_NOT_ACTIVE',
        });
      });
    });
  });

  describe('handleFever', () => {
    const ROUND_ID = 1;

    it('라운드가 없으면 ROUND_NOT_FOUND 예외를 던진다', async () => {
      danggnsRepository.findRoundById.mockResolvedValue(undefined);

      const err = await service.handleFever(ROUND_ID).catch((e) => e);

      expect(err).toBeInstanceOf(DanggnsException);
      expect(err.getResponse()).toMatchObject({ errorCode: 'ROUND_NOT_FOUND' });
    });

    it('이미 피버 키가 있으면 확률·재설정 없이 거부하고 쿨타임만 반환한다', async () => {
      danggnsCacheRepository.exists.mockResolvedValue(true);
      danggnsCacheRepository.getFeverCooltimeRemaining.mockResolvedValue(12);

      const result = await service.handleFever(ROUND_ID);

      expect(result).toEqual({
        isFeverAllowed: false,
        remainingCooltime: 12,
      });
      expect(danggnsCacheRepository.setFever).not.toHaveBeenCalled();
      expect(danggnsCacheRepository.setFeverCooltime).not.toHaveBeenCalled();
    });

    it('쿨타임이 남아 있으면 거부한다', async () => {
      danggnsCacheRepository.getFeverCooltimeRemaining.mockResolvedValue(7);

      const result = await service.handleFever(ROUND_ID);

      expect(result).toEqual({
        isFeverAllowed: false,
        remainingCooltime: 7,
      });
      expect(danggnsCacheRepository.setFever).not.toHaveBeenCalled();
    });

    it('확률 성공 시 피버와 쿨타임을 설정한다', async () => {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

      const result = await service.handleFever(ROUND_ID);

      expect(result).toEqual({ isFeverAllowed: true, remainingCooltime: 0 });
      expect(danggnsCacheRepository.setFever).toHaveBeenCalledWith(1);
      expect(danggnsCacheRepository.setFeverCooltime).toHaveBeenCalledWith(1);

      randomSpy.mockRestore();
    });

    it('확률 실패 시 쿨타임만 설정하고 Redis TTL 기준 남은 시간을 반환한다', async () => {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
      danggnsCacheRepository.getFeverCooltimeRemaining
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(14);

      const result = await service.handleFever(ROUND_ID);

      expect(result).toEqual({
        isFeverAllowed: false,
        remainingCooltime: 14,
      });
      expect(danggnsCacheRepository.setFever).not.toHaveBeenCalled();
      expect(danggnsCacheRepository.setFeverCooltime).toHaveBeenCalledWith(1);

      randomSpy.mockRestore();
    });
  });
});
