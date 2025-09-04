import { db } from '../db';
import { habitsTable } from '../db/schema';
import { type Habit, type UserDataQuery } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export const getHabits = async (query: UserDataQuery): Promise<Habit[]> => {
  try {
    // Fetch all habits for the user, ordered by created_at descending
    const results = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.user_id, query.user_id))
      .orderBy(desc(habitsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch habits:', error);
    throw error;
  }
};

export const getActiveHabits = async (query: UserDataQuery): Promise<Habit[]> => {
  try {
    // Fetch only active habits for the user, ordered by created_at descending
    const results = await db.select()
      .from(habitsTable)
      .where(and(
        eq(habitsTable.user_id, query.user_id),
        eq(habitsTable.is_active, true)
      ))
      .orderBy(desc(habitsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch active habits:', error);
    throw error;
  }
};