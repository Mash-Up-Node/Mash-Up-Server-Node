import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB } from '../db/db.constants';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import { and, eq } from 'drizzle-orm';
import { mashong } from '../schema';
import { Platform } from '../common/type/user';
import { GetMashongInfoResponseDto } from './dto/get-mashong-info.response';
import { MashongException } from './mashong.exception';

@Injectable()
export class MashongService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}
  async getMashongInfo(
    platform: string,
    generationId: number,
  ): Promise<GetMashongInfoResponseDto> {
    const result = await this.db
      .select()
      .from(mashong)
      .where(
        and(
          eq(mashong.platform, Platform[platform]),
          eq(mashong.generationId, generationId),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      throw MashongException.mashongNotFound();
    }

    const mashongInfo = result[0];

    return {
      id: mashongInfo.id,
      platform: platform,
      level: mashongInfo.level,
      accumulatedPopcorn: mashongInfo.accumulatedPopcorn,
      lastPopcorn: mashongInfo.lastPopcorn,
      goalPopcorn: mashongInfo.goalPopcorn,
    };
  }
}
