import { generations } from '../../schema';
import type { SeedTx } from './tx';

export type SeededGeneration = {
  generationId: number;
};

export async function seedGenerations(tx: SeedTx): Promise<SeededGeneration> {
  const [gen] = await tx
    .insert(generations)
    .values({
      number: 16,
      startedAt: new Date('2026-03-01T00:00:00Z'),
      endedAt: new Date('2026-08-31T23:59:59Z'),
      status: 'ACTIVE',
    })
    .returning();

  return { generationId: gen.id };
}
