import { db } from '../db';
import { habitLogsTable, habitsTable } from '../db/schema';
import { type HabitLog, type DateRangeQuery, type UserDataQuery } from '../schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export const getHabitLogs = async (query: UserDataQuery): Promise<HabitLog[]> => {
  try {
    const results = await db.select()
      .from(habitLogsTable)
      .innerJoin(habitsTable, eq(habitLogsTable.habit_id, habitsTable.id))
      .where(eq(habitLogsTable.user_id, query.user_id))
      .orderBy(desc(habitLogsTable.completed_at))
      .execute();

    return results.map(result => ({
      id: result.habit_logs.id,
      habit_id: result.habit_logs.habit_id,
      user_id: result.habit_logs.user_id,
      completed_at: result.habit_logs.completed_at,
      notes: result.habit_logs.notes,
      created_at: result.habit_logs.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch habit logs:', error);
    throw error;
  }
};

export const getHabitLogsByDateRange = async (query: DateRangeQuery): Promise<HabitLog[]> => {
  try {
    const results = await db.select()
      .from(habitLogsTable)
      .innerJoin(habitsTable, eq(habitLogsTable.habit_id, habitsTable.id))
      .where(and(
        eq(habitLogsTable.user_id, query.user_id),
        gte(habitLogsTable.completed_at, query.start_date),
        lte(habitLogsTable.completed_at, query.end_date)
      ))
      .orderBy(desc(habitLogsTable.completed_at))
      .execute();

    return results.map(result => ({
      id: result.habit_logs.id,
      habit_id: result.habit_logs.habit_id,
      user_id: result.habit_logs.user_id,
      completed_at: result.habit_logs.completed_at,
      notes: result.habit_logs.notes,
      created_at: result.habit_logs.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch habit logs by date range:', error);
    throw error;
  }
};