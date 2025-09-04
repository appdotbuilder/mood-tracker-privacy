import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { moodEntriesTable } from '../db/schema';
import { type UpdateMoodEntryInput, type CreateMoodEntryInput } from '../schema';
import { updateMoodEntry } from '../handlers/update_mood_entry';
import { eq } from 'drizzle-orm';

// Helper function to create a test mood entry
const createTestMoodEntry = async (data: CreateMoodEntryInput) => {
  const result = await db.insert(moodEntriesTable)
    .values({
      user_id: data.user_id,
      mood_score: data.mood_score,
      notes: data.notes || null
    })
    .returning()
    .execute();
  return result[0];
};

describe('updateMoodEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update mood score', async () => {
    // Create initial mood entry
    const initialEntry = await createTestMoodEntry({
      user_id: 'test-user-1',
      mood_score: 5,
      notes: 'Initial notes'
    });

    const updateInput: UpdateMoodEntryInput = {
      id: initialEntry.id,
      mood_score: 8
    };

    const result = await updateMoodEntry(updateInput);

    // Verify the update
    expect(result.id).toEqual(initialEntry.id);
    expect(result.user_id).toEqual('test-user-1');
    expect(result.mood_score).toEqual(8);
    expect(result.notes).toEqual('Initial notes'); // Should remain unchanged
    expect(result.created_at).toEqual(initialEntry.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(initialEntry.updated_at.getTime());
  });

  it('should update notes', async () => {
    // Create initial mood entry
    const initialEntry = await createTestMoodEntry({
      user_id: 'test-user-2',
      mood_score: 6,
      notes: 'Original notes'
    });

    const updateInput: UpdateMoodEntryInput = {
      id: initialEntry.id,
      notes: 'Updated notes with more detail'
    };

    const result = await updateMoodEntry(updateInput);

    // Verify the update
    expect(result.id).toEqual(initialEntry.id);
    expect(result.user_id).toEqual('test-user-2');
    expect(result.mood_score).toEqual(6); // Should remain unchanged
    expect(result.notes).toEqual('Updated notes with more detail');
    expect(result.created_at).toEqual(initialEntry.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(initialEntry.updated_at.getTime());
  });

  it('should update both mood score and notes', async () => {
    // Create initial mood entry
    const initialEntry = await createTestMoodEntry({
      user_id: 'test-user-3',
      mood_score: 3,
      notes: null
    });

    const updateInput: UpdateMoodEntryInput = {
      id: initialEntry.id,
      mood_score: 7,
      notes: 'Feeling much better today'
    };

    const result = await updateMoodEntry(updateInput);

    // Verify the update
    expect(result.id).toEqual(initialEntry.id);
    expect(result.user_id).toEqual('test-user-3');
    expect(result.mood_score).toEqual(7);
    expect(result.notes).toEqual('Feeling much better today');
    expect(result.created_at).toEqual(initialEntry.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(initialEntry.updated_at.getTime());
  });

  it('should set notes to null', async () => {
    // Create initial mood entry with notes
    const initialEntry = await createTestMoodEntry({
      user_id: 'test-user-4',
      mood_score: 4,
      notes: 'Some notes to remove'
    });

    const updateInput: UpdateMoodEntryInput = {
      id: initialEntry.id,
      notes: null
    };

    const result = await updateMoodEntry(updateInput);

    // Verify the update
    expect(result.id).toEqual(initialEntry.id);
    expect(result.mood_score).toEqual(4); // Should remain unchanged
    expect(result.notes).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(initialEntry.updated_at.getTime());
  });

  it('should update database record', async () => {
    // Create initial mood entry
    const initialEntry = await createTestMoodEntry({
      user_id: 'test-user-5',
      mood_score: 2,
      notes: 'Bad day'
    });

    const updateInput: UpdateMoodEntryInput = {
      id: initialEntry.id,
      mood_score: 9,
      notes: 'Amazing day!'
    };

    await updateMoodEntry(updateInput);

    // Query database directly to verify update
    const dbEntries = await db.select()
      .from(moodEntriesTable)
      .where(eq(moodEntriesTable.id, initialEntry.id))
      .execute();

    expect(dbEntries).toHaveLength(1);
    expect(dbEntries[0].mood_score).toEqual(9);
    expect(dbEntries[0].notes).toEqual('Amazing day!');
    expect(dbEntries[0].updated_at).toBeInstanceOf(Date);
    expect(dbEntries[0].updated_at.getTime()).toBeGreaterThan(initialEntry.updated_at.getTime());
  });

  it('should handle mood score boundary values', async () => {
    // Create initial mood entry
    const initialEntry = await createTestMoodEntry({
      user_id: 'test-user-6',
      mood_score: 5
    });

    // Test minimum value
    const minInput: UpdateMoodEntryInput = {
      id: initialEntry.id,
      mood_score: 1
    };

    const minResult = await updateMoodEntry(minInput);
    expect(minResult.mood_score).toEqual(1);

    // Test maximum value
    const maxInput: UpdateMoodEntryInput = {
      id: initialEntry.id,
      mood_score: 10
    };

    const maxResult = await updateMoodEntry(maxInput);
    expect(maxResult.mood_score).toEqual(10);
  });

  it('should throw error when mood entry not found', async () => {
    const updateInput: UpdateMoodEntryInput = {
      id: 99999, // Non-existent ID
      mood_score: 5
    };

    await expect(updateMoodEntry(updateInput)).rejects.toThrow(/mood entry with id 99999 not found/i);
  });

  it('should update only specified fields', async () => {
    // Create initial mood entry
    const initialEntry = await createTestMoodEntry({
      user_id: 'test-user-7',
      mood_score: 6,
      notes: 'Initial state'
    });

    // Update only mood score
    const scoreOnlyInput: UpdateMoodEntryInput = {
      id: initialEntry.id,
      mood_score: 4
    };

    const scoreResult = await updateMoodEntry(scoreOnlyInput);
    expect(scoreResult.mood_score).toEqual(4);
    expect(scoreResult.notes).toEqual('Initial state'); // Should remain unchanged

    // Update only notes
    const notesOnlyInput: UpdateMoodEntryInput = {
      id: initialEntry.id,
      notes: 'Updated state'
    };

    const notesResult = await updateMoodEntry(notesOnlyInput);
    expect(notesResult.mood_score).toEqual(4); // Should remain from previous update
    expect(notesResult.notes).toEqual('Updated state');
  });
});