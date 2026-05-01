import { Test, TestingModule } from '@nestjs/testing';
import {
  ActiveGenerationNotFoundException,
  SeminarNotFoundException,
} from './seminar.exception';
import {
  SeminarRepository,
  type Member,
  type MemberProfile,
} from './seminar.repository';
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
            findScheduleById: jest.fn(),
            findSectionsBySchedule: jest.fn(),
            findItemsBySchedule: jest.fn(),
            findActiveActivitiesByGeneration: jest.fn(),
            findRecordsBySchedule: jest.fn(),
            findGenerationById: jest.fn(),
            findMembersByIds: jest.fn(),
            findProfilesByMemberIds: jest.fn(),
            findAttendanceScoresByMemberIds: jest.fn(),
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

  describe('getDetail', () => {
    beforeEach(() => {
      // KST 2026-05-02(토) 12:00 = UTC 03:00 — checkpoint #2 (10~12 UTC)는 닫힘, #3 진행 중 가정용
      jest.useFakeTimers().setSystemTime(new Date('2026-05-02T11:00:00.000Z'));
      // 기본은 빈 sections / items / checkpoints
      repository.findSectionsBySchedule.mockResolvedValue([]);
      repository.findItemsBySchedule.mockResolvedValue([]);
      repository.findCheckpointsBySchedule.mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('schedule이 없으면 SeminarNotFoundException', async () => {
      repository.findScheduleById.mockResolvedValue(null);

      await expect(service.getDetail(999)).rejects.toBeInstanceOf(
        SeminarNotFoundException,
      );
    });

    it('schedule.startedAt이 null이면 SeminarNotFoundException (정보 미정 일정 차단)', async () => {
      repository.findScheduleById.mockResolvedValue(
        buildSchedule({ id: 10, startedAt: null }),
      );

      await expect(service.getDetail(10)).rejects.toBeInstanceOf(
        SeminarNotFoundException,
      );
    });

    it('schedule + sections + items를 매핑하여 응답을 구성한다', async () => {
      repository.findScheduleById.mockResolvedValue(
        buildSchedule({
          id: 10,
          title: '1차 정기 세미나',
          startedAt: new Date('2026-05-02T03:00:00Z'),
          endedAt: new Date('2026-05-02T07:00:00Z'),
          venueName: '강남',
          venueAddress: '서울시 강남구',
          venueLat: '37.498095',
          venueLng: '127.027610',
          notice: '공지사항',
        }),
      );
      repository.findSectionsBySchedule.mockResolvedValue([
        buildSection({
          id: 1,
          seminarScheduleId: 10,
          sortOrder: 1,
          title: 'OT',
          startedAt: new Date('2026-05-02T03:00:00Z'),
          endedAt: new Date('2026-05-02T04:00:00Z'),
        }),
        buildSection({
          id: 2,
          seminarScheduleId: 10,
          sortOrder: 2,
          title: '세미나 발표',
          startedAt: new Date('2026-05-02T04:00:00Z'),
          endedAt: new Date('2026-05-02T07:00:00Z'),
        }),
      ]);
      repository.findItemsBySchedule.mockResolvedValue([
        buildItem({
          id: 11,
          seminarSectionId: 1,
          sortOrder: 1,
          title: '환영사',
          description: null,
          startedAt: new Date('2026-05-02T03:00:00Z'),
        }),
        buildItem({
          id: 12,
          seminarSectionId: 1,
          sortOrder: 2,
          title: '조 발표',
          startedAt: new Date('2026-05-02T03:30:00Z'),
        }),
        buildItem({
          id: 21,
          seminarSectionId: 2,
          sortOrder: 1,
          title: 'Node 1번',
          description: '발표 설명',
          startedAt: new Date('2026-05-02T04:00:00Z'),
        }),
      ]);

      const result = await service.getDetail(10);

      expect(result).toEqual({
        seminarId: 10,
        title: '1차 정기 세미나',
        date: '2026-05-02',
        startsAt: '2026-05-02T03:00:00.000Z',
        endsAt: '2026-05-02T07:00:00.000Z',
        location: {
          name: '강남',
          address: '서울시 강남구',
          latitude: 37.498095,
          longitude: 127.02761,
          mapImageUrl: null,
        },
        notice: '공지사항',
        programSections: [
          {
            sectionNo: 1,
            title: 'OT',
            startsAt: '2026-05-02T03:00:00.000Z',
            endsAt: '2026-05-02T04:00:00.000Z',
            items: [
              {
                order: 1,
                title: '환영사',
                description: null,
                startsAt: '2026-05-02T03:00:00.000Z',
              },
              {
                order: 2,
                title: '조 발표',
                description: null,
                startsAt: '2026-05-02T03:30:00.000Z',
              },
            ],
          },
          {
            sectionNo: 2,
            title: '세미나 발표',
            startsAt: '2026-05-02T04:00:00.000Z',
            endsAt: '2026-05-02T07:00:00.000Z',
            items: [
              {
                order: 1,
                title: 'Node 1번',
                description: '발표 설명',
                startsAt: '2026-05-02T04:00:00.000Z',
              },
            ],
          },
        ],
        attendanceAvailable: false,
      });
    });

    it('checkpoint 중 openedAt~closedAt 사이에 now가 있으면 attendanceAvailable=true', async () => {
      repository.findScheduleById.mockResolvedValue(
        buildSchedule({
          id: 10,
          startedAt: new Date('2026-05-02T03:00:00Z'),
        }),
      );
      repository.findCheckpointsBySchedule.mockResolvedValue([
        buildCheckpoint({
          id: 101,
          openedAt: new Date('2026-05-02T10:00:00Z'),
          closedAt: new Date('2026-05-02T12:00:00Z'),
        }),
      ]);

      const result = await service.getDetail(10);
      expect(result.attendanceAvailable).toBe(true);
    });

    it('모든 checkpoint가 닫혀 있으면 attendanceAvailable=false', async () => {
      repository.findScheduleById.mockResolvedValue(
        buildSchedule({
          id: 10,
          startedAt: new Date('2026-05-02T03:00:00Z'),
        }),
      );
      repository.findCheckpointsBySchedule.mockResolvedValue([
        buildCheckpoint({
          id: 101,
          openedAt: new Date('2026-05-02T06:00:00Z'),
          closedAt: new Date('2026-05-02T08:00:00Z'),
        }),
      ]);

      const result = await service.getDetail(10);
      expect(result.attendanceAvailable).toBe(false);
    });

    it('venueLat/Lng이 null이면 latitude/longitude도 null', async () => {
      repository.findScheduleById.mockResolvedValue(
        buildSchedule({
          id: 10,
          startedAt: new Date('2026-05-02T03:00:00Z'),
          venueLat: null,
          venueLng: null,
        }),
      );

      const result = await service.getDetail(10);
      expect(result.location.latitude).toBeNull();
      expect(result.location.longitude).toBeNull();
    });
  });

  describe('getAttendancePlatforms', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('schedule이 없으면 SeminarNotFoundException', async () => {
      repository.findScheduleById.mockResolvedValue(null);

      await expect(service.getAttendancePlatforms(999)).rejects.toBeInstanceOf(
        SeminarNotFoundException,
      );
    });

    it('platforms는 6개 enum 모두 포함하며 멤버 0명도 빈 summary로 발행', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-02T20:00:00Z'));
      repository.findScheduleById.mockResolvedValue(
        buildSchedule({
          id: 10,
          generationId: 16,
          title: '1차 정기 세미나',
          startedAt: new Date('2026-05-02T03:00:00Z'),
        }),
      );
      repository.findCheckpointsBySchedule.mockResolvedValue([
        buildCheckpoint({
          id: 101,
          openedAt: new Date('2026-05-02T06:00:00Z'),
          lateAt: new Date('2026-05-02T07:00:00Z'),
          closedAt: new Date('2026-05-02T08:00:00Z'),
        }),
      ]);
      repository.findActiveActivitiesByGeneration.mockResolvedValue([]);
      repository.findRecordsBySchedule.mockResolvedValue([]);

      const result = await service.getAttendancePlatforms(10);

      expect(result.platforms.map((p) => p.platform)).toEqual([
        'NODE',
        'SPRING',
        'WEB',
        'iOS',
        'ANDROID',
        'DESIGN',
      ]);
      expect(result.platforms.every((p) => p.memberCount === 0)).toBe(true);
      expect(result.platforms.find((p) => p.platform === 'DESIGN')!).toEqual({
        platformId: 'product-design',
        platform: 'DESIGN',
        label: 'Product Design',
        memberCount: 0,
        summary: { total: 0, attended: 0, late: 0, absent: 0 },
      });
    });

    it('멤버 단위 판정: 모든 ATTENDED→attended / LATE 있고 ABSENT/미체크 없음→late / ABSENT 또는 미체크 있음→absent', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-02T20:00:00Z'));
      repository.findScheduleById.mockResolvedValue(
        buildSchedule({ id: 10, generationId: 16 }),
      );
      const cp1 = buildCheckpoint({ id: 101, roundNo: 1 });
      const cp2 = buildCheckpoint({ id: 102, roundNo: 2 });
      repository.findCheckpointsBySchedule.mockResolvedValue([cp1, cp2]);

      // NODE 4명: 개근 / 지각혼합 / 결석포함 / 미체크
      repository.findActiveActivitiesByGeneration.mockResolvedValue([
        { memberId: 1, platform: 'NODE', role: 'MEMBER' },
        { memberId: 2, platform: 'NODE', role: 'MEMBER' },
        { memberId: 3, platform: 'NODE', role: 'MEMBER' },
        { memberId: 4, platform: 'NODE', role: 'MEMBER' },
      ]);
      repository.findRecordsBySchedule.mockResolvedValue([
        // 1: 모두 ATTENDED → attended
        buildRecord({
          memberId: 1,
          attendanceCheckpointId: 101,
          status: 'ATTENDED',
        }),
        buildRecord({
          memberId: 1,
          attendanceCheckpointId: 102,
          status: 'ATTENDED',
        }),
        // 2: ATTENDED + LATE → late
        buildRecord({
          memberId: 2,
          attendanceCheckpointId: 101,
          status: 'ATTENDED',
        }),
        buildRecord({
          memberId: 2,
          attendanceCheckpointId: 102,
          status: 'LATE',
        }),
        // 3: ATTENDED + ABSENT → absent
        buildRecord({
          memberId: 3,
          attendanceCheckpointId: 101,
          status: 'ATTENDED',
        }),
        buildRecord({
          memberId: 3,
          attendanceCheckpointId: 102,
          status: 'ABSENT',
        }),
        // 4: 미체크 (records 없음) → absent
      ]);

      const result = await service.getAttendancePlatforms(10);
      const node = result.platforms.find((p) => p.platform === 'NODE')!;

      expect(node.summary).toEqual({
        total: 4,
        attended: 1,
        late: 1,
        absent: 2,
      });
    });

    it.each([
      ['BEFORE', '2026-05-02T05:00:00Z'],
      ['IN_PROGRESS', '2026-05-02T06:30:00Z'], // openedAt~lateAt
      ['AGGREGATING', '2026-05-02T07:30:00Z'], // lateAt~closedAt
      ['COMPLETED', '2026-05-02T09:00:00Z'],
    ])('attendancePhase 4단계: %s', async (expected, nowIso) => {
      jest.useFakeTimers().setSystemTime(new Date(nowIso));
      repository.findScheduleById.mockResolvedValue(
        buildSchedule({ id: 10, generationId: 16 }),
      );
      repository.findCheckpointsBySchedule.mockResolvedValue([
        buildCheckpoint({
          id: 101,
          openedAt: new Date('2026-05-02T06:00:00Z'),
          lateAt: new Date('2026-05-02T07:00:00Z'),
          closedAt: new Date('2026-05-02T08:00:00Z'),
        }),
      ]);
      repository.findActiveActivitiesByGeneration.mockResolvedValue([]);
      repository.findRecordsBySchedule.mockResolvedValue([]);

      const result = await service.getAttendancePlatforms(10);
      expect(result.attendancePhase).toBe(expected);
    });

    it('banner는 phase 매핑 그대로 발행 (COMPLETED → success)', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-02T20:00:00Z'));
      repository.findScheduleById.mockResolvedValue(
        buildSchedule({ id: 10, generationId: 16 }),
      );
      repository.findCheckpointsBySchedule.mockResolvedValue([
        buildCheckpoint({
          id: 101,
          openedAt: new Date('2026-05-02T06:00:00Z'),
          lateAt: new Date('2026-05-02T07:00:00Z'),
          closedAt: new Date('2026-05-02T08:00:00Z'),
        }),
      ]);
      repository.findActiveActivitiesByGeneration.mockResolvedValue([]);
      repository.findRecordsBySchedule.mockResolvedValue([]);

      const result = await service.getAttendancePlatforms(10);
      expect(result.banner).toEqual({
        tone: 'success',
        message: '출석체크가 완료되었어요',
      });
    });
  });

  describe('getAttendancePlatformMembers', () => {
    it('잘못된 platformId slug면 SeminarNotFoundException', async () => {
      await expect(
        service.getAttendancePlatformMembers(10, 'invalid-slug'),
      ).rejects.toBeInstanceOf(SeminarNotFoundException);
    });

    it('schedule이 없으면 SeminarNotFoundException', async () => {
      repository.findScheduleById.mockResolvedValue(null);

      await expect(
        service.getAttendancePlatformMembers(10, 'node'),
      ).rejects.toBeInstanceOf(SeminarNotFoundException);
    });

    it('해당 platform의 ACTIVE 멤버만 추려 응답을 구성한다', async () => {
      repository.findScheduleById.mockResolvedValue(
        buildSchedule({ id: 10, generationId: 16 }),
      );
      repository.findGenerationById.mockResolvedValue({ id: 16, number: 16 });
      repository.findCheckpointsBySchedule.mockResolvedValue([
        buildCheckpoint({ id: 101, roundNo: 1, title: '1부' }),
        buildCheckpoint({ id: 102, roundNo: 2, title: '2부' }),
      ]);
      // NODE 2명 + SPRING 1명 (필터로 NODE만 남아야)
      repository.findActiveActivitiesByGeneration.mockResolvedValue([
        { memberId: 1, platform: 'NODE', role: 'MEMBER' },
        { memberId: 2, platform: 'NODE', role: 'LEADER' },
        { memberId: 3, platform: 'SPRING', role: 'MEMBER' },
      ]);
      repository.findMembersByIds.mockResolvedValue([
        buildMember({ id: 1, name: '김매숑' }),
        buildMember({ id: 2, name: '노드리더' }),
      ]);
      repository.findProfilesByMemberIds.mockResolvedValue([
        buildProfile({
          memberId: 1,
          birthDate: '1996-03-05',
          jobTitle: 'Backend Engineer',
          githubUrl: 'https://github.com/example',
        }),
      ]);
      repository.findAttendanceScoresByMemberIds.mockResolvedValue(
        new Map([
          [1, 25],
          [2, 30],
        ]),
      );
      repository.findRecordsBySchedule.mockResolvedValue([
        buildRecord({
          memberId: 1,
          attendanceCheckpointId: 101,
          status: 'ATTENDED',
          checkedAt: new Date('2026-05-02T03:30:00Z'),
        }),
        buildRecord({
          memberId: 1,
          attendanceCheckpointId: 102,
          status: 'LATE',
          checkedAt: new Date('2026-05-02T05:30:00Z'),
        }),
        // 멤버 2 records 없음 → 모두 PENDING fallback
        // 멤버 3 (SPRING) records 있어도 응답엔 안 들어와야
        buildRecord({
          memberId: 3,
          attendanceCheckpointId: 101,
          status: 'ATTENDED',
        }),
      ]);

      const result = await service.getAttendancePlatformMembers(10, 'node');

      expect(result.platform).toBe('NODE');
      expect(result.label).toBe('Node');
      expect(result.memberCount).toBe(2);
      expect(result.members).toHaveLength(2);

      const m1 = result.members.find((m) => m.memberId === 1)!;
      expect(m1.name).toBe('김매숑');
      expect(m1.profile).toEqual({
        birthday: '1996-03-05',
        jobTitle: 'Backend Engineer',
        company: null,
        bio: null,
        socialLinks: { github: 'https://github.com/example' },
        activityScore: 25,
      });
      expect(m1.activityCard).toEqual({
        generationNumber: 16,
        platform: 'NODE',
        role: 'MEMBER',
        status: 'ACTIVE',
      });
      expect(m1.records).toEqual([
        {
          checkpointId: 101,
          label: '1부',
          status: 'ATTENDED',
          checkedAt: '2026-05-02T03:30:00.000Z',
        },
        {
          checkpointId: 102,
          label: '2부',
          status: 'LATE',
          checkedAt: '2026-05-02T05:30:00.000Z',
        },
      ]);

      const m2 = result.members.find((m) => m.memberId === 2)!;
      // profile 없음 → 모두 null + 빈 socialLinks
      expect(m2.profile).toEqual({
        birthday: null,
        jobTitle: null,
        company: null,
        bio: null,
        socialLinks: {},
        activityScore: 30,
      });
      // records 없음 → 모두 PENDING
      expect(m2.records.every((r) => r.status === 'PENDING')).toBe(true);
      expect(m2.records.every((r) => r.checkedAt === null)).toBe(true);
    });

    it('해당 platform에 멤버가 없으면 members는 빈 배열', async () => {
      repository.findScheduleById.mockResolvedValue(
        buildSchedule({ id: 10, generationId: 16 }),
      );
      repository.findGenerationById.mockResolvedValue({ id: 16, number: 16 });
      repository.findCheckpointsBySchedule.mockResolvedValue([]);
      repository.findActiveActivitiesByGeneration.mockResolvedValue([
        { memberId: 1, platform: 'NODE', role: 'MEMBER' },
      ]);
      repository.findMembersByIds.mockResolvedValue([]);
      repository.findProfilesByMemberIds.mockResolvedValue([]);
      repository.findAttendanceScoresByMemberIds.mockResolvedValue(new Map());
      repository.findRecordsBySchedule.mockResolvedValue([]);

      const result = await service.getAttendancePlatformMembers(10, 'ios');
      expect(result.platform).toBe('iOS');
      expect(result.memberCount).toBe(0);
      expect(result.members).toEqual([]);
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

function buildMember(overrides: Partial<Member>): Member {
  return {
    id: 1,
    oauthProvider: 'NAVER',
    oauthProviderUserId: 'naver-1',
    email: 'test@example.com',
    name: 'Test',
    signupCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function buildProfile(overrides: Partial<MemberProfile>): MemberProfile {
  return {
    memberId: 1,
    birthDate: null,
    jobTitle: null,
    company: null,
    bio: null,
    region: null,
    instagramUrl: null,
    githubUrl: null,
    behanceUrl: null,
    linkedinUrl: null,
    tistoryUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildSection(
  overrides: Partial<ReturnType<typeof baseSection>>,
): ReturnType<typeof baseSection> {
  return { ...baseSection(), ...overrides };
}

function baseSection() {
  return {
    id: 1,
    seminarScheduleId: 10,
    title: 'Section',
    description: null as string | null,
    startedAt: null as Date | null,
    endedAt: null as Date | null,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildItem(
  overrides: Partial<ReturnType<typeof baseItem>>,
): ReturnType<typeof baseItem> {
  return { ...baseItem(), ...overrides };
}

function baseItem() {
  return {
    id: 1,
    seminarSectionId: 1,
    title: 'Item',
    description: null as string | null,
    startedAt: null as Date | null,
    endedAt: null as Date | null,
    sortOrder: 1,
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
