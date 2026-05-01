import {
  memberGenerationActivities,
  memberProfiles,
  members,
} from '../../schema';
import type { SeedTx } from './tx';

export type SeededMembers = {
  /** 첫 번째 멤버를 viewer로 가정 (이후 인증 머지 후 JWT 기반으로 교체 예정) */
  viewerId: number;
  memberIds: number[];
};

type MemberSeed = {
  oauthProviderUserId: string;
  email: string;
  name: string;
  platform: 'NODE' | 'SPRING' | 'WEB' | 'iOS' | 'ANDROID' | 'DESIGN';
  role: 'LEADER' | 'SUBLEADER' | 'MEMBER';
  profile: {
    birthDate: string;
    jobTitle: string;
    company: string;
    bio: string;
    region?: string;
    githubUrl?: string;
    linkedinUrl?: string;
  };
};

const memberSeeds: MemberSeed[] = [
  // === NODE (4명) — viewer 포함 ===
  {
    oauthProviderUserId: 'naver-viewer-001',
    email: 'viewer@example.com',
    name: '노매숑1',
    platform: 'NODE',
    role: 'MEMBER',
    profile: {
      birthDate: '1996-03-05',
      jobTitle: 'Backend Engineer',
      company: 'Mash-Up Corp.',
      bio: '매쉬업에 뼈를 묻겠습니다!',
      region: '서울',
      githubUrl: 'https://github.com/example-viewer',
    },
  },
  {
    oauthProviderUserId: 'naver-node-001',
    email: 'node-leader@example.com',
    name: '노매숑2',
    platform: 'NODE',
    role: 'LEADER',
    profile: {
      birthDate: '1994-05-10',
      jobTitle: 'Senior Backend Engineer',
      company: 'NestJS Co.',
      bio: 'Nest 사랑',
      githubUrl: 'https://github.com/node-leader',
    },
  },
  {
    oauthProviderUserId: 'naver-node-002',
    email: 'node-2@example.com',
    name: '노매숑3',
    platform: 'NODE',
    role: 'MEMBER',
    profile: {
      birthDate: '1999-04-15',
      jobTitle: 'Backend Engineer',
      company: 'Async Inc.',
      bio: 'TypeScript 신봉자',
    },
  },
  {
    oauthProviderUserId: 'naver-node-003',
    email: 'node-3@example.com',
    name: '노매숑4',
    platform: 'NODE',
    role: 'MEMBER',
    profile: {
      birthDate: '2000-08-20',
      jobTitle: 'Junior Backend Engineer',
      company: 'Promise Ltd.',
      bio: 'await 좋아요',
    },
  },

  // === SPRING (4명) ===
  {
    oauthProviderUserId: 'naver-002',
    email: 'spring@example.com',
    name: '스매숑1',
    platform: 'SPRING',
    role: 'LEADER',
    profile: {
      birthDate: '1995-07-12',
      jobTitle: 'Backend Engineer',
      company: 'JVM Inc.',
      bio: 'Spring 충성 충성',
    },
  },
  {
    oauthProviderUserId: 'naver-spring-002',
    email: 'spring-2@example.com',
    name: '스매숑2',
    platform: 'SPRING',
    role: 'SUBLEADER',
    profile: {
      birthDate: '1996-02-14',
      jobTitle: 'Backend Engineer',
      company: 'Bean Studio',
      bio: 'JPA 마스터',
    },
  },
  {
    oauthProviderUserId: 'naver-spring-003',
    email: 'spring-3@example.com',
    name: '스매숑3',
    platform: 'SPRING',
    role: 'MEMBER',
    profile: {
      birthDate: '1998-10-03',
      jobTitle: 'Backend Engineer',
      company: 'Kotlin House',
      bio: 'Kotlin + Spring',
    },
  },
  {
    oauthProviderUserId: 'naver-spring-004',
    email: 'spring-4@example.com',
    name: '스매숑4',
    platform: 'SPRING',
    role: 'MEMBER',
    profile: {
      birthDate: '1999-12-25',
      jobTitle: 'Junior Backend Engineer',
      company: 'WebFlux Lab',
      bio: 'Reactive 입문자',
    },
  },

  // === WEB (3명) ===
  {
    oauthProviderUserId: 'naver-003',
    email: 'web@example.com',
    name: '웹매숑1',
    platform: 'WEB',
    role: 'MEMBER',
    profile: {
      birthDate: '1997-11-30',
      jobTitle: 'Frontend Engineer',
      company: 'Web Studio',
      bio: '리액트 좋아',
    },
  },
  {
    oauthProviderUserId: 'naver-web-002',
    email: 'web-2@example.com',
    name: '웹매숑2',
    platform: 'WEB',
    role: 'LEADER',
    profile: {
      birthDate: '1995-06-18',
      jobTitle: 'Senior Frontend Engineer',
      company: 'Next.js Co.',
      bio: 'SSR/RSC 광신도',
    },
  },
  {
    oauthProviderUserId: 'naver-web-003',
    email: 'web-3@example.com',
    name: '웹매숑3',
    platform: 'WEB',
    role: 'MEMBER',
    profile: {
      birthDate: '2001-03-21',
      jobTitle: 'Junior Frontend Engineer',
      company: 'Hooks Studio',
      bio: 'useState 졸업했어요',
    },
  },

  // === ANDROID (3명) ===
  {
    oauthProviderUserId: 'naver-004',
    email: 'android@example.com',
    name: '안매숑1',
    platform: 'ANDROID',
    role: 'MEMBER',
    profile: {
      birthDate: '1998-01-22',
      jobTitle: 'Android Engineer',
      company: 'Droid Co.',
      bio: 'Kotlin 짱짱',
    },
  },
  {
    oauthProviderUserId: 'naver-android-002',
    email: 'android-2@example.com',
    name: '안매숑2',
    platform: 'ANDROID',
    role: 'LEADER',
    profile: {
      birthDate: '1995-09-08',
      jobTitle: 'Senior Android Engineer',
      company: 'Compose Inc.',
      bio: 'Jetpack Compose 전도사',
    },
  },
  {
    oauthProviderUserId: 'naver-android-003',
    email: 'android-3@example.com',
    name: '안매숑3',
    platform: 'ANDROID',
    role: 'MEMBER',
    profile: {
      birthDate: '2000-11-11',
      jobTitle: 'Android Engineer',
      company: 'Coroutine Lab',
      bio: 'Flow 좋아',
    },
  },

  // === iOS (3명) — 신규 ===
  {
    oauthProviderUserId: 'naver-ios-001',
    email: 'ios-1@example.com',
    name: '아매숑1',
    platform: 'iOS',
    role: 'LEADER',
    profile: {
      birthDate: '1994-12-01',
      jobTitle: 'Senior iOS Engineer',
      company: 'Swift Co.',
      bio: 'SwiftUI 마스터',
    },
  },
  {
    oauthProviderUserId: 'naver-ios-002',
    email: 'ios-2@example.com',
    name: '아매숑2',
    platform: 'iOS',
    role: 'MEMBER',
    profile: {
      birthDate: '1997-05-19',
      jobTitle: 'iOS Engineer',
      company: 'TCA Inc.',
      bio: 'TCA 입문 중',
    },
  },
  {
    oauthProviderUserId: 'naver-ios-003',
    email: 'ios-3@example.com',
    name: '아매숑3',
    platform: 'iOS',
    role: 'MEMBER',
    profile: {
      birthDate: '1999-07-07',
      jobTitle: 'Junior iOS Engineer',
      company: 'UIKit Studio',
      bio: 'AutoLayout 정복 중',
    },
  },

  // === DESIGN (3명) ===
  {
    oauthProviderUserId: 'naver-005',
    email: 'design@example.com',
    name: '프매숑1',
    platform: 'DESIGN',
    role: 'SUBLEADER',
    profile: {
      birthDate: '1996-09-09',
      jobTitle: 'Product Designer',
      company: 'Design Lab',
      bio: 'Figma 매니아',
    },
  },
  {
    oauthProviderUserId: 'naver-design-002',
    email: 'design-2@example.com',
    name: '프매숑2',
    platform: 'DESIGN',
    role: 'LEADER',
    profile: {
      birthDate: '1993-11-15',
      jobTitle: 'Lead Product Designer',
      company: 'Pixel Studio',
      bio: '디자인 시스템 사랑',
    },
  },
  {
    oauthProviderUserId: 'naver-design-003',
    email: 'design-3@example.com',
    name: '프매숑3',
    platform: 'DESIGN',
    role: 'MEMBER',
    profile: {
      birthDate: '2001-02-28',
      jobTitle: 'Junior Product Designer',
      company: 'Sketch Co.',
      bio: '컴포넌트화 학습 중',
    },
  },
];

export async function seedMembers(
  tx: SeedTx,
  ctx: { generationId: number },
): Promise<SeededMembers> {
  const insertedMembers = await tx
    .insert(members)
    .values(
      memberSeeds.map((m) => ({
        oauthProvider: 'NAVER' as const,
        oauthProviderUserId: m.oauthProviderUserId,
        email: m.email,
        name: m.name,
        signupCompleted: true,
      })),
    )
    .returning();

  await tx.insert(memberProfiles).values(
    insertedMembers.map((member, idx) => ({
      memberId: member.id,
      birthDate: memberSeeds[idx].profile.birthDate,
      jobTitle: memberSeeds[idx].profile.jobTitle,
      company: memberSeeds[idx].profile.company,
      bio: memberSeeds[idx].profile.bio,
      region: memberSeeds[idx].profile.region,
      githubUrl: memberSeeds[idx].profile.githubUrl,
      linkedinUrl: memberSeeds[idx].profile.linkedinUrl,
    })),
  );

  await tx.insert(memberGenerationActivities).values(
    insertedMembers.map((member, idx) => ({
      memberId: member.id,
      generationId: ctx.generationId,
      platform: memberSeeds[idx].platform,
      role: memberSeeds[idx].role,
      status: 'ACTIVE' as const,
      joinedAt: new Date('2026-03-01T00:00:00Z'),
    })),
  );

  return {
    viewerId: insertedMembers[0].id,
    memberIds: insertedMembers.map((m) => m.id),
  };
}
