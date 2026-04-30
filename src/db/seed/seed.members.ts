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

const memberSeeds: Array<{
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
}> = [
  {
    oauthProviderUserId: 'naver-viewer-001',
    email: 'viewer@example.com',
    name: '김매숑',
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
    oauthProviderUserId: 'naver-002',
    email: 'spring@example.com',
    name: '이스프링',
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
    oauthProviderUserId: 'naver-003',
    email: 'web@example.com',
    name: '박웹',
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
    oauthProviderUserId: 'naver-004',
    email: 'android@example.com',
    name: '최안드',
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
    oauthProviderUserId: 'naver-005',
    email: 'design@example.com',
    name: '정디자인',
    platform: 'DESIGN',
    role: 'SUBLEADER',
    profile: {
      birthDate: '1996-09-09',
      jobTitle: 'Product Designer',
      company: 'Design Lab',
      bio: 'Figma 매니아',
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
