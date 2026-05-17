import { Request } from 'express';
import { members } from '../schema';

export type Member = typeof members.$inferSelect;

export type AuthClient = 'WEB' | 'NATIVE';

export type AccessTokenPayload = {
  memberId: number;
  signupCompleted: boolean;
};

export interface AuthenticatedRequest extends Request {
  member: Member;
}
