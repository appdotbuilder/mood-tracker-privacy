import { db } from '../db';
import { habitsTable } from '../db/schema';
import { type CreateHabitInput, type Habit } from '../schema';

export const createHabit = async (input: CreateHabitInput): Promise<Habit> => {
  try {
    // Insert habit record
    const result = await db.insert(habitsTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        description: input.description || null,
        target_frequency: input.target_frequency,
        is_active: true // Default value as per schema
      })
      .returning()
      .execute();

    // Return the created habit
    return result[0];
  } catch (error) {
    console.error('Habit creation failed:', error);
    throw error;
  }
};