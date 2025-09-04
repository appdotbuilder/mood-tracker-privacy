import { db } from '../db';
import { moodEntriesTable } from '../db/schema';
import { type UpdateMoodEntryInput, type MoodEntry } from '../schema';
import { eq } from 'drizzle-orm';

export const updateMoodEntry = async (input: UpdateMoodEntryInput): Promise<MoodEntry> => {
  try {
    // Build the update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.mood_score !== undefined) {
      updateData.mood_score = input.mood_score;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    // Update the mood entry
    const result = await db.update(moodEntriesTable)
      .set(updateData)
      .where(eq(moodEntriesTable.id, input.id))
      .returning()
      .execute();

    // Check if the mood entry was found and updated
    if (result.length === 0) {
      throw new Error(`Mood entry with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Mood entry update failed:', error);
    throw error;
  }
};