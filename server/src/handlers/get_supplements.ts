import { db } from '../db';
import { supplementsTable } from '../db/schema';
import { type Supplement, type UserDataQuery } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export const getSupplements = async (query: UserDataQuery): Promise<Supplement[]> => {
  try {
    const results = await db.select()
      .from(supplementsTable)
      .where(eq(supplementsTable.user_id, query.user_id))
      .orderBy(desc(supplementsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch supplements:', error);
    throw error;
  }
};

export const getActiveSupplements = async (query: UserDataQuery): Promise<Supplement[]> => {
  try {
    const results = await db.select()
      .from(supplementsTable)
      .where(
        and(
          eq(supplementsTable.user_id, query.user_id),
          eq(supplementsTable.is_active, true)
        )
      )
      .orderBy(desc(supplementsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch active supplements:', error);
    throw error;
  }
};