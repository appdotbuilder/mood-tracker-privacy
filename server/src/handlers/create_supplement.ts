import { db } from '../db';
import { supplementsTable } from '../db/schema';
import { type CreateSupplementInput, type Supplement } from '../schema';

export const createSupplement = async (input: CreateSupplementInput): Promise<Supplement> => {
  try {
    // Insert supplement record
    const result = await db.insert(supplementsTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        dosage: input.dosage || null,
        frequency: input.frequency,
        is_active: true // Default to active
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Supplement creation failed:', error);
    throw error;
  }
};