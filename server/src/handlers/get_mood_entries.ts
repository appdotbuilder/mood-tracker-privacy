import { db } from '../db';
import { moodEntriesTable } from '../db/schema';
import { type MoodEntry, type DateRangeQuery, type UserDataQuery } from '../schema';
import { eq, and, gte, lte, desc, SQL } from 'drizzle-orm';

export const getMoodEntries = async (query: UserDataQuery): Promise<MoodEntry[]> => {
  try {
    const results = await db.select()
      .from(moodEntriesTable)
      .where(eq(moodEntriesTable.user_id, query.user_id))
      .orderBy(desc(moodEntriesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get mood entries:', error);
    throw error;
  }
};

export const getMoodEntriesByDateRange = async (query: DateRangeQuery): Promise<MoodEntry[]> => {
  try {
    const conditions: SQL<unknown>[] = [
      eq(moodEntriesTable.user_id, query.user_id)
    ];

    // Add date range conditions
    conditions.push(gte(moodEntriesTable.created_at, query.start_date));
    conditions.push(lte(moodEntriesTable.created_at, query.end_date));

    const results = await db.select()
      .from(moodEntriesTable)
      .where(and(...conditions))
      .orderBy(desc(moodEntriesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get mood entries by date range:', error);
    throw error;
  }
};