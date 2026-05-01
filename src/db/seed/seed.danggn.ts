import {
  carrotRoundRankings,
  carrotRounds,
  carrotShakeEvents,
} from '../../schema';
import type { SeedTx } from './tx';

/**
 * 당근 도메인 시드.
 * - 종료된 라운드 1개 (roundNo=1) + ranking
 * - 진행 중인 라운드 1개 (roundNo=2) + 일부 shakes
 *
 * 데이터는 deterministic하게 구성 (테스트/디버깅 재현 가능).
 */
export async function seedDanggn(
  tx: SeedTx,
  ctx: { generationId: number; viewerId: number; memberIds: number[] },
): Promise<void> {
  const now = new Date();
  const oneHour = 60 * 60 * 1000;

  // ── 라운드 ─────────────────────────────────────────────────
  const [endedRound] = await tx
    .insert(carrotRounds)
    .values({
      generationId: ctx.generationId,
      roundNo: 1,
      startedAt: new Date(now.getTime() - 2 * oneHour),
      endedAt: new Date(now.getTime() - oneHour),
    })
    .returning();

  const [activeRound] = await tx
    .insert(carrotRounds)
    .values({
      generationId: ctx.generationId,
      roundNo: 2,
      startedAt: new Date(now.getTime() - oneHour),
      endedAt: new Date(now.getTime() + oneHour),
    })
    .returning();

  // ── shake 분배 ────────────────────────────────────────────
  // viewer는 충분한 데이터가 보이도록 두 라운드 모두 다회 shake
  const otherMembers = ctx.memberIds.filter((id) => id !== ctx.viewerId);

  const endedShakes = [
    // viewer: 결과적으로 high score
    ...buildShakes(endedRound.id, ctx.viewerId, [50, 80, 120, 200, 300]),
    // 다른 멤버: 다양한 점수
    ...otherMembers.flatMap((memberId, idx) =>
      buildShakes(endedRound.id, memberId, sampleScoresFor(idx)),
    ),
  ];

  const activeShakes = [
    ...buildShakes(activeRound.id, ctx.viewerId, [30, 70, 90]),
    ...otherMembers
      .slice(0, 10)
      .flatMap((memberId, idx) =>
        buildShakes(activeRound.id, memberId, sampleScoresFor(idx).slice(0, 2)),
      ),
  ];

  await tx.insert(carrotShakeEvents).values([...endedShakes, ...activeShakes]);

  // ── 종료 라운드 ranking 스냅샷 ────────────────────────────
  const totalsByMember = new Map<number, number>();
  for (const s of endedShakes) {
    totalsByMember.set(
      s.memberId,
      (totalsByMember.get(s.memberId) ?? 0) + s.scoreDelta,
    );
  }
  const rankings = [...totalsByMember.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([memberId, finalScore], idx) => ({
      roundId: endedRound.id,
      memberId,
      finalRank: idx + 1,
      finalScore,
    }));
  await tx.insert(carrotRoundRankings).values(rankings);
}

function buildShakes(roundId: number, memberId: number, scores: number[]) {
  return scores.map((scoreDelta) => ({ roundId, memberId, scoreDelta }));
}

/**
 * 멤버 인덱스에 따라 다양한 점수 패턴을 deterministic하게 부여.
 * 일부 멤버는 피버에 해당하는 큰 점수도 포함.
 */
function sampleScoresFor(memberIdx: number): number[] {
  const patterns: number[][] = [
    [40, 80, 1200, 60], // 피버 포함 high score
    [50, 100, 70],
    [20, 30, 25, 15],
    [80, 120, 90, 200],
    [10, 5, 8],
    [60, 90, 2500, 110], // 피버 포함
    [40, 30, 20],
    [100, 150, 80],
    [55, 65, 75, 85],
    [30, 50],
    [70, 110, 90, 300],
    [25],
    [90, 60, 40, 80, 50],
    [200, 150],
    [45, 35, 25],
    [80, 60, 40],
    [110, 1500, 70], // 피버
    [30, 20, 10],
    [70, 50, 30, 90],
  ];
  return patterns[memberIdx % patterns.length];
}
