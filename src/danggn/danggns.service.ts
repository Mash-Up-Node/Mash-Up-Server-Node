import { Injectable } from '@nestjs/common';
import { DanggnsRepository } from './danggns.repository';

type RoundStatus = 'IN_PROGRESS' | 'ENDED' | 'UPCOMING';

export type DanggnsRoundsResponseDto = {
  roundId: number;
  roundNo: number;
  status: RoundStatus;
  startedAt: string;
  endedAt: string;
}[];

// TODO: 인증 구현 후 토큰에서 추출한 실제 유저 ID로 교체
const MOCK_USER_ID = 1;
const MOCK_GENERATION_ID = 2;

@Injectable()
export class DanggnsService {
  constructor(private readonly danggnsRepository: DanggnsRepository) {}

  async getRounds(): Promise<DanggnsRoundsResponseDto> {
    const activity =
      await this.danggnsRepository.findActiveGenerationByMemberId(MOCK_USER_ID);
    if (!activity) {
      return [];
    }

    const rounds = await this.danggnsRepository.findRecentRoundsByGenerationId(
      MOCK_GENERATION_ID,
      15,
    );
    const now = new Date();

    return rounds.map((round) => ({
      roundId: round.id,
      roundNo: round.roundNo,
      status: this.computeRoundStatus(now, round.startedAt, round.endedAt),
      startedAt: round.startedAt.toISOString(),
      endedAt: round.endedAt.toISOString(),
    }));
  }

  private computeRoundStatus(
    now: Date,
    startedAt: Date,
    endedAt: Date,
  ): RoundStatus {
    if (now < startedAt) return 'UPCOMING';
    if (now > endedAt) return 'ENDED';
    return 'IN_PROGRESS';
  }
}
