import { seminarAttendanceRecords } from '../../schema';
import type { SeedTx } from './tx';

type RecordStatus = 'ATTENDED' | 'LATE' | 'ABSENT';

/**
 * past 세미나의 멤버별 출석 패턴 (3개 checkpoint 순서대로).
 * null = records 없음 (멤버 단위 판정에서 absent로 분류)
 *
 * memberIds 순서 (seed.members.ts의 memberSeeds와 동일):
 * [0] 김매숑 NODE, [1] 노드리더 NODE, [2] 노드두번째 NODE, [3] 노드세번째 NODE,
 * [4] 이스프링 SPRING, [5] 스프링둘 SPRING, [6] 스프링셋 SPRING, [7] 스프링넷 SPRING,
 * [8] 박웹 WEB, [9] 웹둘 WEB, [10] 웹셋 WEB,
 * [11] 최안드 ANDROID, [12] 안드둘 ANDROID, [13] 안드셋 ANDROID,
 * [14] iOS하나, [15] iOS둘, [16] iOS셋,
 * [17] 정디자인 DESIGN, [18] 디자둘 DESIGN, [19] 디자셋 DESIGN
 */
const PAST_RECORD_PATTERNS: Array<(RecordStatus | null)[]> = [
  ['ATTENDED', 'LATE', 'ABSENT'], // 김매숑 (mixed)
  ['ATTENDED', 'ATTENDED', 'ATTENDED'], // 노드리더 (개근)
  ['ATTENDED', 'ATTENDED', 'LATE'], // 노드두번째 (late)
  [null, null, null], // 노드세번째 (records 없음 → absent)

  ['ATTENDED', 'ATTENDED', 'ATTENDED'], // 이스프링
  ['ATTENDED', 'LATE', 'ATTENDED'], // 스프링둘 (late)
  ['ABSENT', 'ABSENT', 'ABSENT'], // 스프링셋 (absent)
  [null, null, null], // 스프링넷

  ['ATTENDED', 'ATTENDED', 'ATTENDED'], // 박웹
  ['ATTENDED', 'ATTENDED', 'LATE'], // 웹둘
  [null, null, null], // 웹셋

  ['ATTENDED', 'LATE', 'LATE'], // 최안드 (late)
  ['ATTENDED', 'ATTENDED', 'ATTENDED'], // 안드둘
  ['ATTENDED', 'ATTENDED', 'ABSENT'], // 안드셋 (absent)

  ['ATTENDED', 'LATE', 'ABSENT'], // iOS하나
  [null, null, null], // iOS둘
  ['ABSENT', null, null], // iOS셋

  ['ATTENDED', 'ATTENDED', 'ATTENDED'], // 정디자인
  [null, null, null], // 디자둘
  ['ATTENDED', 'LATE', null], // 디자셋
];

const SCORE_BY_STATUS: Record<RecordStatus, number> = {
  ATTENDED: 10,
  LATE: 5,
  ABSENT: 0,
};

export async function seedAttendance(
  tx: SeedTx,
  ctx: {
    viewerId: number;
    memberIds: number[];
    pastCheckpointIds: number[];
  },
): Promise<void> {
  const rows: Array<typeof seminarAttendanceRecords.$inferInsert> = [];

  for (const [memberIdx, pattern] of PAST_RECORD_PATTERNS.entries()) {
    const memberId = ctx.memberIds[memberIdx];
    if (memberId === undefined) continue;

    for (const [checkpointIdx, status] of pattern.entries()) {
      const checkpointId = ctx.pastCheckpointIds[checkpointIdx];
      if (checkpointId === undefined || status === null) continue;

      rows.push({
        attendanceCheckpointId: checkpointId,
        memberId,
        scoreDelta: SCORE_BY_STATUS[status],
        status,
        checkedAt: status === 'ABSENT' ? null : new Date(),
        checkMethod: status === 'ABSENT' ? null : 'QR',
      });
    }
  }

  await tx.insert(seminarAttendanceRecords).values(rows);
}
