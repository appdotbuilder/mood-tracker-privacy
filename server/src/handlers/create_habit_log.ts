import { db } from '../db';
import { habitLogsTable, habitsTable } from '../db/schema';
import { type CreateHabitLogInput, type HabitLog } from '../schema';
import { eq } from 'drizzle-orm';

export const createHabitLog = async (input: CreateHabitLogInput): Promise<HabitLog> => {
  try {
    // Verify that the habit exists and belongs to the user
    const habit = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.id, input.habit_id))
      .execute();

    if (habit.length === 0) {
      throw new Error(`Habit with id ${input.habit_id} not found`);
    }

    if (habit[0].user_id !== input.user_id) {
      throw new Error(`Habit with id ${input.habit_id} does not belong to user ${input.user_id}`);
    }

    // Insert habit log record
    const result = await db.insert(habitLogsTable)
      .values({
        habit_id: input.habit_id,
        user_id: input.user_id,
        completed_at: input.completed_at || new Date(),
        notes: input.notes || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Habit log creation failed:', error);
    throw error;
  }
};