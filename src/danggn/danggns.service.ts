import { Injectable } from '@nestjs/common';
import { DanggnsException } from './danggns.exception';
import { DanggnsRepository } from './danggns.repository';
import { DanggnsCacheRepository } from './danggns-cache.repository';

export type DanggnsFeverResponseDto = {
  isFeverAllowed: boolean;
  remainingCooltime: number;
};

const MOCK_USER_ID = 1;
const FEVER_PROBABILITY = 0.1;

@Injectable()
export class DanggnsService {
  constructor(
    private readonly danggnsRepository: DanggnsRepository,
    private readonly danggnsCacheRepository: DanggnsCacheRepository,
  ) {}

  async handleFever(roundId: number): Promise<DanggnsFeverResponseDto> {
    const round = await this.findRoundByIdOrThrow(roundId);

    const now = new Date();
    if (now < round.startedAt || now > round.endedAt) {
      throw DanggnsException.roundClosed();
    }

    // 중복 진입 제한: 이미 피버라면 연장/재발생 없이 그대로 거부
    const feverActive = await this.danggnsCacheRepository.exists(MOCK_USER_ID);
    if (feverActive) {
      const remainingCooltime =
        await this.danggnsCacheRepository.getFeverCooltimeRemaining(
          MOCK_USER_ID,
        );
      return { isFeverAllowed: false, remainingCooltime };
    }

    // 쿨타임 제한
    const remainingCooltime =
      await this.danggnsCacheRepository.getFeverCooltimeRemaining(MOCK_USER_ID);
    if (remainingCooltime > 0) {
      return { isFeverAllowed: false, remainingCooltime };
    }

    const isFeverAllowed = Math.random() < FEVER_PROBABILITY;
    if (isFeverAllowed) {
      await Promise.all([
        this.danggnsCacheRepository.setFever(MOCK_USER_ID),
        this.danggnsCacheRepository.setFeverCooltime(MOCK_USER_ID),
      ]);
      return { isFeverAllowed: true, remainingCooltime: 0 };
    }

    // 확률 실패 시에도 쿨타임 부여 (재시도 스팸 방지)
    await this.danggnsCacheRepository.setFeverCooltime(MOCK_USER_ID);
    const coolAfter =
      await this.danggnsCacheRepository.getFeverCooltimeRemaining(MOCK_USER_ID);
    return { isFeverAllowed: false, remainingCooltime: coolAfter };
  }

  private async findRoundByIdOrThrow(roundId: number) {
    const round = await this.danggnsRepository.findRoundById(roundId);
    if (!round) {
      throw DanggnsException.roundNotFound();
    }
    return round;
  }
}
