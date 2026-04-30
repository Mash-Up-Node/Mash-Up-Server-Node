import { Injectable } from '@nestjs/common';
import { DanggnsException } from './danggns.exception';
import { DanggnsRepository } from './danggns.repository';
import { DanggnsCacheRepository } from './danggns-cache.repository';
import { RankingRepository } from './ranking.repository';

export type DanggnsRoundResponseDto = {
  serverTime: string;
  meta: {
    roundNo: number;
    startedAt: string;
    endedAt: string;
    myRank: number | null;
    myScore: number | null;
    myTeamRank: number | null;
    myTeamScore: number | null;
  };
  rankings: {
    crews: { memberId: number; name: string; score: number }[];
    platforms: { platform: string; score: number }[];
  };
};

const MOCK_USER_ID = 42;
const MOCK_PLATFORM = 'NODE';

@Injectable()
export class DanggnsService {
  constructor(
    private readonly danggnsRepository: DanggnsRepository,
    private readonly rankingRepository: RankingRepository,
    private readonly danggnsCacheRepository: DanggnsCacheRepository,
  ) {}

  /**
   * 라운드 랭킹 데이터를 조회합니다.
   *
   * - 종료된 라운드: 라운드 종료 시점에 확정된 스냅샷(carrot_round_rankings) 기준으로 조회합니다.
   * - 진행 중인 라운드: Redis ZSet 기준으로 조회하며, ZSet이 없는 경우 DB 로그로 복구합니다.
   *   ZSet 복구 여부는 키 자체의 존재로 판단합니다(특정 유저의 멤버십 여부가 아닌 라운드 단위).
   *   미참여 유저의 경우 ZSet이 존재해도 zRevRank가 null을 반환하므로 myRank: null로 정상 처리됩니다.
   */
  async getRoundData(roundId: number): Promise<DanggnsRoundResponseDto> {
    const round = await this.findRoundByIdOrThrow(roundId);

    if (new Date() > round.endedAt) {
      return this.getRoundDataFromSnapshot(round);
    }

    const memberKey = this.getMemberRoundKey(roundId);
    const crewKey = this.getCrewRoundKey(roundId);

    const [memberKeyExists, isRestored] = await Promise.all([
      this.rankingRepository.exists(memberKey),
      this.danggnsCacheRepository.isRankingRestored(roundId),
    ]);
    if (!memberKeyExists && !isRestored) {
      await this.restoreRankingFromDb(roundId, round.generationId);
    }

    const [
      myRankRaw,
      myScoreRaw,
      myTeamRankRaw,
      myTeamScoreRaw,
      crewEntries,
      platformEntries,
    ] = await Promise.all([
      this.rankingRepository.zRevRank(memberKey, String(MOCK_USER_ID)),
      this.rankingRepository.zScore(memberKey, String(MOCK_USER_ID)),
      this.rankingRepository.zRevRank(crewKey, MOCK_PLATFORM),
      this.rankingRepository.zScore(crewKey, MOCK_PLATFORM),
      this.rankingRepository.zRevRangeWithScores(memberKey, 0, -1),
      this.rankingRepository.zRevRangeWithScores(crewKey, 0, -1),
    ]);

    const memberIds = crewEntries.map((e) => Number(e.member));
    const members = await this.danggnsRepository.findMembersByIds(memberIds);
    const memberNameMap = new Map(members.map((m) => [m.id, m.name ?? '']));

    return {
      serverTime: new Date().toISOString(),
      meta: {
        roundNo: round.roundNo,
        startedAt: round.startedAt.toISOString(),
        endedAt: round.endedAt.toISOString(),
        myRank: myRankRaw !== null ? myRankRaw + 1 : null,
        myScore: myScoreRaw !== null ? Number(myScoreRaw) : null,
        myTeamRank: myTeamRankRaw !== null ? myTeamRankRaw + 1 : null,
        myTeamScore: myTeamScoreRaw !== null ? Number(myTeamScoreRaw) : null,
      },
      rankings: {
        crews: crewEntries.map((e) => ({
          memberId: Number(e.member),
          name: memberNameMap.get(Number(e.member)) ?? '',
          score: e.score,
        })),
        platforms: platformEntries.map((e) => ({
          platform: e.member,
          score: e.score,
        })),
      },
    };
  }

  private async getRoundDataFromSnapshot(
    round: Awaited<ReturnType<DanggnsRepository['findRoundById']>> & object,
  ): Promise<DanggnsRoundResponseDto> {
    const [rankingEntries, platformScores] = await Promise.all([
      this.danggnsRepository.findRoundRankings(round.id),
      this.danggnsRepository.aggregatePlatformScoresBySnapshot(
        round.id,
        round.generationId,
      ),
    ]);

    const memberIds = rankingEntries.map((r) => r.memberId);
    const members = await this.danggnsRepository.findMembersByIds(memberIds);
    const memberNameMap = new Map(members.map((m) => [m.id, m.name ?? '']));

    const myRanking = rankingEntries.find((r) => r.memberId === MOCK_USER_ID);
    const myPlatformIdx = platformScores.findIndex(
      (p) => p.platform === MOCK_PLATFORM,
    );

    return {
      serverTime: new Date().toISOString(),
      meta: {
        roundNo: round.roundNo,
        startedAt: round.startedAt.toISOString(),
        endedAt: round.endedAt.toISOString(),
        myRank: myRanking?.finalRank ?? null,
        myScore: myRanking?.finalScore ?? null,
        myTeamRank: myPlatformIdx !== -1 ? myPlatformIdx + 1 : null,
        myTeamScore:
          myPlatformIdx !== -1
            ? platformScores[myPlatformIdx].totalScore
            : null,
      },
      rankings: {
        crews: rankingEntries.map((r) => ({
          memberId: r.memberId,
          name: memberNameMap.get(r.memberId) ?? '',
          score: r.finalScore,
        })),
        platforms: platformScores.map((p) => ({
          platform: p.platform,
          score: p.totalScore,
        })),
      },
    };
  }

  /**
   * carrot_shake_events 로그를 집계해 Redis ZSet을 재구성합니다.
   *
   * DB 결과가 비어 있어도(라운드 시작 직후 등) setRankingRestored를 항상 호출해
   * 30s TTL 마커를 설정함으로써 빈 라운드에 대한 반복적인 DB 조회를 방지합니다.
   */
  private async restoreRankingFromDb(
    roundId: number,
    generationId: number,
  ): Promise<void> {
    const [memberScores, platformScores] = await Promise.all([
      this.danggnsRepository.aggregateShakeScoresByMember(roundId),
      this.danggnsRepository.aggregateShakeScoresByPlatform(
        roundId,
        generationId,
      ),
    ]);

    const memberKey = this.getMemberRoundKey(roundId);
    const crewKey = this.getCrewRoundKey(roundId);

    await Promise.all([
      this.rankingRepository.zAddBulk(
        memberKey,
        memberScores.map((s) => ({
          member: String(s.memberId),
          score: s.totalScore,
        })),
      ),
      this.rankingRepository.zAddBulk(
        crewKey,
        platformScores.map((s) => ({
          member: s.platform,
          score: s.totalScore,
        })),
      ),
      this.danggnsCacheRepository.setRankingRestored(roundId),
    ]);
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
}
