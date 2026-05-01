import { Test, TestingModule } from '@nestjs/testing';
import { ActiveGenerationNotFoundException } from './seminar.exception';
import { SeminarRepository } from './seminar.repository';
import { SeminarService } from './seminar.service';

describe('SeminarService', () => {
  let service: SeminarService;
  let repository: jest.Mocked<SeminarRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeminarService,
        {
          provide: SeminarRepository,
          useValue: {
            findActiveGeneration: jest.fn(),
            findMemberName: jest.fn(),
            findSchedulesByGeneration: jest.fn(),
            findThisWeekSchedule: jest.fn(),
            findNextScheduleStartedAt: jest.fn(),
            findCheckpointsBySchedule: jest.fn(),
            findRecordsByMemberAndSchedule: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SeminarService>(SeminarService);
    repository = module.get(SeminarRepository);
  });

  describe('getSchedules', () => {
    beforeEach(() => {
      // 모든 테스트의 "지금"을 KST 2026-04-29(수) 12:00로 고정
      // → 이번 주 = 2026-04-27(월) ~ 2026-05-04(월) KST
      jest.useFakeTimers().setSystemTime(new Date('2026-04-29T03:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('viewer 활동 기수가 없으면 ActiveGenerationNotFoundException을 던진다', async () => {
      repository.findActiveGeneration.mockResolvedValue(null);

      await expect(service.getSchedules(99)).rejects.toBeInstanceOf(
        ActiveGenerationNotFoundException,
      );
    });

    it('schedules를 KST 월별로 그룹핑하고 generation 정보를 반환한다', async () => {
      repository.findActiveGeneration.mockResolvedValue({
        id: 16,
        number: 16,
      });
      repository.findSchedulesByGeneration.mockResolvedValue([
        buildSchedule({
          id: 1,
          title: '1차 세미나',
          startedAt: new Date('2026-04-15T03:00:00Z'), // KST 4/15
        }),
        buildSchedule({
          id: 2,
          title: '2차 세미나',
          startedAt: new Date('2026-05-02T03:00:00Z'), // KST 5/2 (이번주!)
          venueName: '디스코드',
        }),
        buildSchedule({
          id: 3,
          title: '3차 세미나',
          startedAt: new Date('2026-05-20T03:00:00Z'), // KST 5/20
        }),
      ]);

      const result = await service.getSchedules(1);

      expect(result.generation).toEqual({ id: 16, number: 16 });
      expect(result.months).toHaveLength(2);
      expect(result.months[0]).toMatchObject({ year: 2026, month: 4 });
      expect(result.months[1]).toMatchObject({ year: 2026, month: 5 });
      expect(result.months[1].items.map((i) => i.seminarId)).toEqual([2, 3]);
    });

    it('이번 주(KST) 내 세미나는 isHighlighted=true', async () => {
      repository.findActiveGeneration.mockResolvedValue({
        id: 16,
        number: 16,
      });
      repository.findSchedulesByGeneration.mockResolvedValue([
        buildSchedule({
          id: 10,
          title: '저번주',
          startedAt: new Date('2026-04-22T03:00:00Z'),
        }),
        buildSchedule({
          id: 11,
          title: '이번주 토요일',
          startedAt: new Date('2026-05-02T03:00:00Z'),
        }),
        buildSchedule({
          id: 12,
          title: '다음주',
          startedAt: new Date('2026-05-06T03:00:00Z'),
        }),
      ]);

      const result = await service.getSchedules(1);
      const items = result.months.flatMap((m) => m.items);
      const byId = Object.fromEntries(items.map((i) => [i.seminarId, i]));

      expect(byId[10].isHighlighted).toBe(false);
      expect(byId[11].isHighlighted).toBe(true);
      expect(byId[12].isHighlighted).toBe(false);
    });

    it('각 항목의 date/weekday/startsAt/endsAt/locationName을 채운다', async () => {
      repository.findActiveGeneration.mockResolvedValue({
        id: 16,
        number: 16,
      });
      repository.findSchedulesByGeneration.mockResolvedValue([
        buildSchedule({
          id: 1,
          title: '세미나',
          startedAt: new Date('2026-05-02T03:00:00Z'),
          endedAt: new Date('2026-05-02T10:00:00Z'),
          venueName: '강남',
        }),
      ]);

      const [item] = (await service.getSchedules(1)).months[0].items;
      expect(item).toEqual({
        seminarId: 1,
        date: '2026-05-02',
        weekday: 'SAT',
        title: '세미나',
        startsAt: '2026-05-02T03:00:00.000Z',
        endsAt: '2026-05-02T10:00:00.000Z',
        locationName: '강남',
        isHighlighted: true,
      });
    });

    it('startedAt이 null인 일정은 그룹에서 제외된다', async () => {
      repository.findActiveGeneration.mockResolvedValue({
        id: 16,
        number: 16,
      });
      repository.findSchedulesByGeneration.mockResolvedValue([
        buildSchedule({
          id: 1,
          title: '날짜 미정',
          startedAt: null,
        }),
        buildSchedule({
          id: 2,
          title: '정상',
          startedAt: new Date('2026-05-02T03:00:00Z'),
        }),
      ]);

      const result = await service.getSchedules(1);
      const ids = result.months.flatMap((m) => m.items.map((i) => i.seminarId));
      expect(ids).toEqual([2]);
    });
  });

  describe('getThisWeek', () => {
    beforeEach(() => {
      // KST 2026-04-29(수) 12:00 = UTC 2026-04-29T03:00:00Z
      // 이번 주 = KST 4/27(월) ~ 5/4(월) = UTC 4/26 15:00 ~ 5/3 15:00
      jest.useFakeTimers().setSystemTime(new Date('2026-04-29T03:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('viewer 활동 기수가 없으면 ActiveGenerationNotFoundException을 던진다', async () => {
      repository.findActiveGeneration.mockResolvedValue(null);
      repository.findMemberName.mockResolvedValue('김매숑');

      await expect(service.getThisWeek(99)).rejects.toBeInstanceOf(
        ActiveGenerationNotFoundException,
      );
    });

    it('이번 주 세미나가 없으면 thisWeekSeminar는 null', async () => {
      repository.findActiveGeneration.mockResolvedValue({ id: 16, number: 16 });
      repository.findMemberName.mockResolvedValue('김매숑');
      repository.findThisWeekSchedule.mockResolvedValue(null);
      repository.findNextScheduleStartedAt.mockResolvedValue(
        new Date('2026-05-15T03:00:00Z'), // 16일 후
      );
      repository.findCheckpointsBySchedule.mockResolvedValue([]);
      repository.findRecordsByMemberAndSchedule.mockResolvedValue([]);

      const result = await service.getThisWeek(1);

      expect(result.thisWeekSeminar).toBeNull();
      expect(result.daysUntilNextSeminar).toBe(16);
      expect(result.generation).toEqual({ id: 16, number: 16 });
      expect(result.serverTime).toBe('2026-04-29T03:00:00.000Z');
    });

    it('checkpoints가 있으면 attendance.records를 채우고 viewerName을 포함 (record 없는 부분은 PENDING)', async () => {
      repository.findActiveGeneration.mockResolvedValue({ id: 16, number: 16 });
      repository.findMemberName.mockResolvedValue('김매숑');
      repository.findThisWeekSchedule.mockResolvedValue(
        buildSchedule({
          id: 10,
          startedAt: new Date('2026-05-02T03:00:00Z'),
        }),
      );
      repository.findNextScheduleStartedAt.mockResolvedValue(
        new Date('2026-05-02T03:00:00Z'),
      );
      repository.findCheckpointsBySchedule.mockResolvedValue([
        buildCheckpoint({
          id: 101,
          seminarScheduleId: 10,
          roundNo: 1,
          title: '1부',
        }),
        buildCheckpoint({
          id: 102,
          seminarScheduleId: 10,
          roundNo: 2,
          title: '2부',
        }),
        buildCheckpoint({
          id: 103,
          seminarScheduleId: 10,
          roundNo: 3,
          title: '최종',
        }),
      ]);
      repository.findRecordsByMemberAndSchedule.mockResolvedValue([
        buildRecord({
          attendanceCheckpointId: 101,
          memberId: 1,
          status: 'ATTENDED',
          checkedAt: new Date('2026-05-02T03:30:00Z'),
        }),
      ]);

      const result = await service.getThisWeek(1);
      const seminar = result.thisWeekSeminar;

      expect(seminar).not.toBeNull();
      expect(seminar!.attendance.viewerName).toBe('김매숑');
      expect(seminar!.attendance.records).toEqual([
        {
          checkpointId: 101,
          label: '1부',
          status: 'ATTENDED',
          checkedAt: '2026-05-02T03:30:00.000Z',
        },
        {
          checkpointId: 102,
          label: '2부',
          status: 'PENDING',
          checkedAt: null,
        },
        {
          checkpointId: 103,
          label: '최종',
          status: 'PENDING',
          checkedAt: null,
        },
      ]);
      expect(seminar!.badge).toEqual({ type: 'SEMINAR', label: 'Semina' });
    });

    it('checkpoints가 없으면 attendance는 phase=BEFORE, records=[] 빈 객체', async () => {
      repository.findActiveGeneration.mockResolvedValue({ id: 16, number: 16 });
      repository.findMemberName.mockResolvedValue('김매숑');
      repository.findThisWeekSchedule.mockResolvedValue(
        buildSchedule({
          id: 20,
          startedAt: new Date('2026-05-02T03:00:00Z'),
        }),
      );
      repository.findNextScheduleStartedAt.mockResolvedValue(
        new Date('2026-05-02T03:00:00Z'),
      );
      repository.findCheckpointsBySchedule.mockResolvedValue([]);
      repository.findRecordsByMemberAndSchedule.mockResolvedValue([]);

      const result = await service.getThisWeek(1);
      expect(result.thisWeekSeminar?.attendance).toEqual({
        phase: 'BEFORE',
        viewerName: '김매숑',
        records: [],
      });
    });

    it('가까운 미래 세미나가 없으면 daysUntilNextSeminar는 null', async () => {
      repository.findActiveGeneration.mockResolvedValue({ id: 16, number: 16 });
      repository.findMemberName.mockResolvedValue('김매숑');
      repository.findThisWeekSchedule.mockResolvedValue(null);
      repository.findNextScheduleStartedAt.mockResolvedValue(null);
      repository.findCheckpointsBySchedule.mockResolvedValue([]);
      repository.findRecordsByMemberAndSchedule.mockResolvedValue([]);

      const result = await service.getThisWeek(1);
      expect(result.daysUntilNextSeminar).toBeNull();
    });
  });

  describe('attendance phase 계산 (private 메서드 동작 검증, getThisWeek 통한 간접 검증)', () => {
    beforeEach(() => {
      repository.findActiveGeneration.mockResolvedValue({ id: 16, number: 16 });
      repository.findMemberName.mockResolvedValue('김매숑');
      repository.findThisWeekSchedule.mockResolvedValue(
        buildSchedule({
          id: 10,
          startedAt: new Date('2026-05-02T03:00:00Z'),
        }),
      );
      repository.findNextScheduleStartedAt.mockResolvedValue(
        new Date('2026-05-02T03:00:00Z'),
      );
      repository.findRecordsByMemberAndSchedule.mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const checkpoints = [
      buildCheckpoint({
        id: 101,
        roundNo: 1,
        openedAt: new Date('2026-05-02T06:00:00Z'),
        closedAt: new Date('2026-05-02T08:00:00Z'),
      }),
      buildCheckpoint({
        id: 102,
        roundNo: 2,
        openedAt: new Date('2026-05-02T10:00:00Z'),
        closedAt: new Date('2026-05-02T12:00:00Z'),
      }),
      buildCheckpoint({
        id: 103,
        roundNo: 3,
        openedAt: new Date('2026-05-02T14:00:00Z'),
        closedAt: new Date('2026-05-02T16:00:00Z'),
      }),
    ];

    it.each([
      ['첫 openedAt 전', '2026-05-02T05:00:00.000Z', 'BEFORE'],
      ['첫 openedAt 정각', '2026-05-02T06:00:00.000Z', 'IN_PROGRESS'],
      ['체크포인트 사이 휴식', '2026-05-02T09:00:00.000Z', 'IN_PROGRESS'],
      ['마지막 closedAt 정각', '2026-05-02T16:00:00.000Z', 'IN_PROGRESS'],
      ['마지막 closedAt 직후', '2026-05-02T16:00:00.001Z', 'COMPLETED'],
    ])('%s → %s', async (_desc, nowIso, expected) => {
      jest.useFakeTimers().setSystemTime(new Date(nowIso));
      repository.findCheckpointsBySchedule.mockResolvedValue(checkpoints);

      const result = await service.getThisWeek(1);
      expect(result.thisWeekSeminar?.attendance.phase).toBe(expected);
    });
  });
});

function buildSchedule(
  overrides: Partial<ReturnType<typeof baseSchedule>>,
): ReturnType<typeof baseSchedule> {
  return { ...baseSchedule(), ...overrides };
}

function baseSchedule() {
  return {
    id: 1,
    generationId: 16,
    title: 'Title',
    description: null,
    startedAt: null as Date | null,
    endedAt: null as Date | null,
    venueName: null as string | null,
    venueAddress: null as string | null,
    venueLat: null as string | null,
    venueLng: null as string | null,
    notice: null as string | null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildCheckpoint(
  overrides: Partial<ReturnType<typeof baseCheckpoint>>,
): ReturnType<typeof baseCheckpoint> {
  return { ...baseCheckpoint(), ...overrides };
}

function baseCheckpoint() {
  return {
    id: 101,
    seminarScheduleId: 10,
    roundNo: 1,
    title: '1부',
    openedAt: new Date('2026-05-02T03:00:00Z'),
    lateAt: new Date('2026-05-02T04:00:00Z'),
    closedAt: new Date('2026-05-02T05:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildRecord(
  overrides: Partial<ReturnType<typeof baseRecord>>,
): ReturnType<typeof baseRecord> {
  return { ...baseRecord(), ...overrides };
}

function baseRecord() {
  return {
    id: 1,
    attendanceCheckpointId: 101,
    memberId: 1,
    scoreDelta: 0,
    status: 'ATTENDED' as 'ATTENDED' | 'LATE' | 'ABSENT',
    checkedAt: null as Date | null,
    checkMethod: null as 'QR' | 'MANUAL' | null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
