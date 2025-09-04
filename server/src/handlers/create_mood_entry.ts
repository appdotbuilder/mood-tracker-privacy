import { db } from '../db';
import { moodEntriesTable } from '../db/schema';
import { type CreateMoodEntryInput, type MoodEntry } from '../schema';

export const createMoodEntry = async (input: CreateMoodEntryInput): Promise<MoodEntry> => {
  try {
    // Insert mood entry record
    const result = await db.insert(moodEntriesTable)
      .values({
        user_id: input.user_id,
        mood_score: input.mood_score,
        notes: input.notes || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Mood entry creation failed:', error);
    throw error;
  }
};