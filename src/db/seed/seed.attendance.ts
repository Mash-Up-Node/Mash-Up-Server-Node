import { seminarAttendanceRecords } from '../../schema';
import type { SeedTx } from './tx';

/**
 * 출석 기록 시드:
 * - past 세미나: viewer는 1부 ATTENDED, 2부 LATE, 3부 ABSENT (다양한 상태 검증용)
 * - 다른 멤버 일부도 records 추가하여 그리드 화면 구성 가능하게
 * - thisWeek 세미나: records 없음 (BEFORE phase, viewerAttendance.records가 PENDING fallback 동작 검증)
 */
export async function seedAttendance(
  tx: SeedTx,
  ctx: {
    viewerId: number;
    memberIds: number[];
    pastCheckpointIds: number[];
  },
): Promise<void> {
  const [cp1, cp2, cp3] = ctx.pastCheckpointIds;
  const otherMembers = ctx.memberIds.filter((id) => id !== ctx.viewerId);

  await tx.insert(seminarAttendanceRecords).values([
    // viewer 본인 출석 (다양한 상태)
    {
      attendanceCheckpointId: cp1,
      memberId: ctx.viewerId,
      scoreDelta: 10,
      status: 'ATTENDED',
      checkedAt: new Date(),
      checkMethod: 'QR',
    },
    {
      attendanceCheckpointId: cp2,
      memberId: ctx.viewerId,
      scoreDelta: 5,
      status: 'LATE',
      checkedAt: new Date(),
      checkMethod: 'QR',
    },
    {
      attendanceCheckpointId: cp3,
      memberId: ctx.viewerId,
      scoreDelta: 0,
      status: 'ABSENT',
      checkedAt: null,
      checkMethod: null,
    },
    // 다른 멤버: 첫 번째 다른 멤버는 모두 출석
    ...(otherMembers.length > 0
      ? [
          {
            attendanceCheckpointId: cp1,
            memberId: otherMembers[0],
            scoreDelta: 10,
            status: 'ATTENDED' as const,
            checkedAt: new Date(),
            checkMethod: 'QR' as const,
          },
          {
            attendanceCheckpointId: cp2,
            memberId: otherMembers[0],
            scoreDelta: 10,
            status: 'ATTENDED' as const,
            checkedAt: new Date(),
            checkMethod: 'QR' as const,
          },
          {
            attendanceCheckpointId: cp3,
            memberId: otherMembers[0],
            scoreDelta: 10,
            status: 'ATTENDED' as const,
            checkedAt: new Date(),
            checkMethod: 'QR' as const,
          },
        ]
      : []),
  ]);
}
