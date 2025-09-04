import { db } from '../db';
import { medicationLogsTable, medicationsTable } from '../db/schema';
import { type MedicationLog, type DateRangeQuery, type UserDataQuery } from '../schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export const getMedicationLogs = async (query: UserDataQuery): Promise<MedicationLog[]> => {
  try {
    const results = await db.select()
      .from(medicationLogsTable)
      .where(eq(medicationLogsTable.user_id, query.user_id))
      .orderBy(desc(medicationLogsTable.taken_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get medication logs:', error);
    throw error;
  }
};

export const getMedicationLogsByDateRange = async (query: DateRangeQuery): Promise<MedicationLog[]> => {
  try {
    const results = await db.select()
      .from(medicationLogsTable)
      .where(
        and(
          eq(medicationLogsTable.user_id, query.user_id),
          gte(medicationLogsTable.taken_at, query.start_date),
          lte(medicationLogsTable.taken_at, query.end_date)
        )
      )
      .orderBy(desc(medicationLogsTable.taken_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get medication logs by date range:', error);
    throw error;
  }
};