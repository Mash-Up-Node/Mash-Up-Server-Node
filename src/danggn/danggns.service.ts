import { Injectable } from '@nestjs/common';
import { DanggnsException } from './danggns.exception';
import { DanggnsRepository } from './danggns.repository';
import { DanggnsCacheRepository } from './danggns-cache.repository';
import { RankingRepository } from './ranking.repository';

type RoundStatus = 'IN_PROGRESS' | 'ENDED' | 'UPCOMING';

export type DanggnsShakeResponseDto = {
  appliedScore: number;
  currentRoundScore: number;
  currentCrewScore: number;
  isFeverApplied: boolean;
};

export type DanggnsFeverResponseDto = {
  isFeverAllowed: boolean;
  remainingCooltime: number;
};

export type DanggnsRoundsResponseDto = {
  roundId: number;
  roundNo: number;
  status: RoundStatus;
  startedAt: string;
  endedAt: string;
}[];

// TODO: 인증 구현 후 토큰에서 추출한 실제 유저 ID로 교체
const MOCK_USER_ID = 1;
const MOCK_PLATFORM = 'NODE';
const MOCK_GENERATION_ID = 2;
const MAX_SHAKE_COUNT = 1500;
const MAX_SHAKES_PER_SECOND = 20;
const MAX_CLIENT_TIME_SKEW_MS = 5000;
const FEVER_MULTIPLIER = 10;
const FEVER_PROBABILITY = 0.1;

@Injectable()
export class DanggnsService {
  constructor(
    private readonly danggnsRepository: DanggnsRepository,
    private readonly rankingRepository: RankingRepository,
    private readonly danggnsCacheRepository: DanggnsCacheRepository,
  ) {}

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

  async handleShake(
    roundId: number,
    shakeCount: number,
    sentAt: string,
    isFever: boolean,
  ): Promise<DanggnsShakeResponseDto> {
    const round = await this.findRoundByIdOrThrow(roundId);

    const now = new Date(sentAt);
    if (now < round.startedAt || now > round.endedAt) {
      throw DanggnsException.roundClosed();
    }

    const lastSentAt =
      await this.danggnsCacheRepository.getLastSentAt(MOCK_USER_ID);
    this.validateAbusing(shakeCount, sentAt, lastSentAt);
    const isFeverApplied = await this.validateFever(isFever);

    const appliedScore = isFeverApplied
      ? shakeCount * FEVER_MULTIPLIER
      : shakeCount;
    const memberKey = this.getMemberRoundKey(roundId);
    const crewKey = this.getCrewRoundKey(roundId);

    const [currentRoundScore, currentCrewScore] = await Promise.all([
      this.rankingRepository.zIncrBy(
        memberKey,
        appliedScore,
        String(MOCK_USER_ID),
      ),
      this.rankingRepository.zIncrBy(crewKey, appliedScore, MOCK_PLATFORM),
    ]);

    await Promise.all([
      this.danggnsRepository.insertShakeEvent({
        roundId,
        memberId: MOCK_USER_ID,
        scoreDelta: appliedScore,
      }),
      this.danggnsCacheRepository.setLastSentAt(MOCK_USER_ID, Date.now()),
    ]);

    return {
      appliedScore,
      currentRoundScore: Number(currentRoundScore),
      currentCrewScore: Number(currentCrewScore),
      isFeverApplied,
    };
  }

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

  private computeRoundStatus(
    now: Date,
    startedAt: Date,
    endedAt: Date,
  ): RoundStatus {
    if (now < startedAt) return 'UPCOMING';
    if (now > endedAt) return 'ENDED';
    return 'IN_PROGRESS';
  }

  private getMemberRoundKey(roundId: number) {
    return `danggns:round:${roundId}:members`;
  }

  private getCrewRoundKey(roundId: number) {
    return `danggns:round:${roundId}:crew`;
  }

  private async findRoundByIdOrThrow(roundId: number) {
    const round = await this.danggnsRepository.findRoundById(roundId);
    if (!round) {
      throw DanggnsException.roundNotFound();
    }
    return round;
  }

  private validateAbusing(
    shakeCount: number,
    sentAt: string,
    lastSentAt: number | null,
  ) {
    // 1. 단일 요청 한계치 체크
    if (shakeCount <= 0 || shakeCount > MAX_SHAKE_COUNT) {
      throw DanggnsException.abnormalShakeCount();
    }

    // 2. 시간 조작 체크
    const now = Date.now();
    if (Date.parse(sentAt) - now > MAX_CLIENT_TIME_SKEW_MS) {
      throw DanggnsException.abnormalShakeCount();
    }

    // 3. 물리적 속도 한계 체크
    if (lastSentAt !== null) {
      const elapsedSeconds = Math.max(1, (now - lastSentAt) / 1000);
      const maxPossibleCount = Math.floor(
        MAX_SHAKES_PER_SECOND * elapsedSeconds,
      );

      if (shakeCount > maxPossibleCount) {
        throw DanggnsException.abnormalShakeCount();
      }
    }
  }

  private async validateFever(isFever: boolean): Promise<boolean> {
    // 피버 활성화 여부 교차 검증
    if (!isFever) {
      return false;
    }

    const feverExists = await this.danggnsCacheRepository.exists(MOCK_USER_ID);
    if (!feverExists) {
      throw DanggnsException.feverNotActive();
    }

    return true;
  }
}
