import { db } from '../db';
import { medicationsTable } from '../db/schema';
import { type Medication, type UserDataQuery } from '../schema';
import { eq, desc, and } from 'drizzle-orm';

export const getMedications = async (query: UserDataQuery): Promise<Medication[]> => {
  try {
    const results = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.user_id, query.user_id))
      .orderBy(desc(medicationsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch medications:', error);
    throw error;
  }
};

export const getActiveMedications = async (query: UserDataQuery): Promise<Medication[]> => {
  try {
    const results = await db.select()
      .from(medicationsTable)
      .where(and(
        eq(medicationsTable.user_id, query.user_id),
        eq(medicationsTable.is_active, true)
      ))
      .orderBy(desc(medicationsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch active medications:', error);
    throw error;
  }
};