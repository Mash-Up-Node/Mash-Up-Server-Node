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
            findSchedulesByGeneration: jest.fn(),
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
