import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../schema';

/**
 * 트랜잭션 콜백 안에서 사용 가능한 db 타입.
 * 일반 NodePgDatabase와 동일한 query/insert API를 제공한다.
 */
export type SeedTx = Parameters<
  Parameters<NodePgDatabase<typeof schema>['transaction']>[0]
>[0];
