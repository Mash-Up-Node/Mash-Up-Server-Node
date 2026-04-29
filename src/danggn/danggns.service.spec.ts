import { Test, TestingModule } from '@nestjs/testing';
import { DanggnsService } from './danggns.service';
import { DanggnsRepository } from './danggns.repository';
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
  let danggnsCacheRepository: jest.Mocked<DanggnsCacheRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DanggnsService,
        {
          provide: DanggnsRepository,
          useValue: {
            findRoundById: jest.fn(),
          },
        },
        {
          provide: DanggnsCacheRepository,
          useValue: {
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
    danggnsCacheRepository = module.get(DanggnsCacheRepository);

    danggnsRepository.findRoundById.mockResolvedValue(MOCK_ROUND);
    danggnsCacheRepository.exists.mockResolvedValue(false);
    danggnsCacheRepository.getFeverCooltimeRemaining.mockResolvedValue(0);
    danggnsCacheRepository.setFever.mockResolvedValue(undefined);
    danggnsCacheRepository.setFeverCooltime.mockResolvedValue(undefined);
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
