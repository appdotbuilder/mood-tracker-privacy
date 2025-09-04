import { db } from '../db';
import { supplementLogsTable, supplementsTable } from '../db/schema';
import { type CreateSupplementLogInput, type SupplementLog } from '../schema';
import { eq } from 'drizzle-orm';

export const createSupplementLog = async (input: CreateSupplementLogInput): Promise<SupplementLog> => {
  try {
    // Verify the supplement exists and belongs to the user
    const supplement = await db.select()
      .from(supplementsTable)
      .where(eq(supplementsTable.id, input.supplement_id))
      .execute();

    if (supplement.length === 0) {
      throw new Error(`Supplement with id ${input.supplement_id} not found`);
    }

    if (supplement[0].user_id !== input.user_id) {
      throw new Error(`Supplement with id ${input.supplement_id} does not belong to user ${input.user_id}`);
    }

    // Insert supplement log record
    const result = await db.insert(supplementLogsTable)
      .values({
        supplement_id: input.supplement_id,
        user_id: input.user_id,
        taken_at: input.taken_at || new Date(),
        notes: input.notes || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Supplement log creation failed:', error);
    throw error;
  }
};