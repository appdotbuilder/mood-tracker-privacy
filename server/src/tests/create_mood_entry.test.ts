import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { moodEntriesTable } from '../db/schema';
import { type CreateMoodEntryInput } from '../schema';
import { createMoodEntry } from '../handlers/create_mood_entry';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateMoodEntryInput = {
  user_id: 'user-123',
  mood_score: 7,
  notes: 'Feeling good today'
};

describe('createMoodEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a mood entry with all fields', async () => {
    const result = await createMoodEntry(testInput);

    // Basic field validation
    expect(result.user_id).toEqual('user-123');
    expect(result.mood_score).toEqual(7);
    expect(result.notes).toEqual('Feeling good today');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a mood entry without notes', async () => {
    const inputWithoutNotes: CreateMoodEntryInput = {
      user_id: 'user-456',
      mood_score: 5
    };

    const result = await createMoodEntry(inputWithoutNotes);

    expect(result.user_id).toEqual('user-456');
    expect(result.mood_score).toEqual(5);
    expect(result.notes).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a mood entry with empty notes', async () => {
    const inputWithEmptyNotes: CreateMoodEntryInput = {
      user_id: 'user-789',
      mood_score: 3,
      notes: null
    };

    const result = await createMoodEntry(inputWithEmptyNotes);

    expect(result.user_id).toEqual('user-789');
    expect(result.mood_score).toEqual(3);
    expect(result.notes).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should save mood entry to database', async () => {
    const result = await createMoodEntry(testInput);

    // Query using proper drizzle syntax
    const moodEntries = await db.select()
      .from(moodEntriesTable)
      .where(eq(moodEntriesTable.id, result.id))
      .execute();

    expect(moodEntries).toHaveLength(1);
    expect(moodEntries[0].user_id).toEqual('user-123');
    expect(moodEntries[0].mood_score).toEqual(7);
    expect(moodEntries[0].notes).toEqual('Feeling good today');
    expect(moodEntries[0].created_at).toBeInstanceOf(Date);
    expect(moodEntries[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle mood scores at boundaries', async () => {
    // Test minimum mood score
    const minMoodInput: CreateMoodEntryInput = {
      user_id: 'user-min',
      mood_score: 1,
      notes: 'Worst day'
    };

    const minResult = await createMoodEntry(minMoodInput);
    expect(minResult.mood_score).toEqual(1);
    expect(minResult.notes).toEqual('Worst day');

    // Test maximum mood score
    const maxMoodInput: CreateMoodEntryInput = {
      user_id: 'user-max',
      mood_score: 10,
      notes: 'Best day ever'
    };

    const maxResult = await createMoodEntry(maxMoodInput);
    expect(maxResult.mood_score).toEqual(10);
    expect(maxResult.notes).toEqual('Best day ever');
  });

  it('should create multiple mood entries for same user', async () => {
    const firstEntry: CreateMoodEntryInput = {
      user_id: 'user-multi',
      mood_score: 6,
      notes: 'Morning mood'
    };

    const secondEntry: CreateMoodEntryInput = {
      user_id: 'user-multi',
      mood_score: 8,
      notes: 'Evening mood'
    };

    const firstResult = await createMoodEntry(firstEntry);
    const secondResult = await createMoodEntry(secondEntry);

    // Both entries should be created successfully
    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.user_id).toEqual(secondResult.user_id);
    expect(firstResult.mood_score).toEqual(6);
    expect(secondResult.mood_score).toEqual(8);

    // Verify both entries exist in database
    const allEntries = await db.select()
      .from(moodEntriesTable)
      .where(eq(moodEntriesTable.user_id, 'user-multi'))
      .execute();

    expect(allEntries).toHaveLength(2);
  });

  it('should handle different user IDs correctly', async () => {
    const user1Entry: CreateMoodEntryInput = {
      user_id: 'user-001',
      mood_score: 4,
      notes: 'User 1 feeling'
    };

    const user2Entry: CreateMoodEntryInput = {
      user_id: 'user-002',
      mood_score: 9,
      notes: 'User 2 feeling'
    };

    const result1 = await createMoodEntry(user1Entry);
    const result2 = await createMoodEntry(user2Entry);

    expect(result1.user_id).toEqual('user-001');
    expect(result2.user_id).toEqual('user-002');
    expect(result1.mood_score).toEqual(4);
    expect(result2.mood_score).toEqual(9);

    // Verify entries are stored separately
    const user1Entries = await db.select()
      .from(moodEntriesTable)
      .where(eq(moodEntriesTable.user_id, 'user-001'))
      .execute();

    const user2Entries = await db.select()
      .from(moodEntriesTable)
      .where(eq(moodEntriesTable.user_id, 'user-002'))
      .execute();

    expect(user1Entries).toHaveLength(1);
    expect(user2Entries).toHaveLength(1);
    expect(user1Entries[0].notes).toEqual('User 1 feeling');
    expect(user2Entries[0].notes).toEqual('User 2 feeling');
  });
});