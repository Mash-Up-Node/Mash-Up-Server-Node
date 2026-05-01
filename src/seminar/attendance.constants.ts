import type { Platform } from './seminar.repository';

export const PLATFORM_SLUG: Record<Platform, string> = {
  NODE: 'node',
  SPRING: 'spring',
  WEB: 'web',
  iOS: 'ios',
  ANDROID: 'android',
  DESIGN: 'product-design',
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  NODE: 'Node',
  SPRING: 'Spring',
  WEB: 'Web',
  iOS: 'iOS',
  ANDROID: 'Android',
  DESIGN: 'Product Design',
};

const SLUG_TO_PLATFORM: Record<string, Platform> = Object.fromEntries(
  Object.entries(PLATFORM_SLUG).map(([k, v]) => [v, k as Platform]),
) as Record<string, Platform>;

export function slugToPlatform(slug: string): Platform | null {
  return SLUG_TO_PLATFORM[slug] ?? null;
}

export const BANNER_BY_PHASE = {
  BEFORE: { tone: 'info', message: '출석 시작 전이에요' },
  IN_PROGRESS: { tone: 'info', message: '출석체크 진행 중이에요' },
  AGGREGATING: { tone: 'warning', message: '출석 결과를 정리하고 있어요' },
  COMPLETED: { tone: 'success', message: '출석체크가 완료되었어요' },
} as const;
