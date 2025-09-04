import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { moodEntriesTable } from '../db/schema';
import { type UserDataQuery, type DateRangeQuery } from '../schema';
import { getMoodEntries, getMoodEntriesByDateRange } from '../handlers/get_mood_entries';

// Test user IDs
const testUserId1 = 'user_123';
const testUserId2 = 'user_456';

// Helper function to create test mood entries
const createTestMoodEntries = async () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  await db.insert(moodEntriesTable).values([
    {
      user_id: testUserId1,
      mood_score: 8,
      notes: 'Feeling great today!',
      created_at: now,
      updated_at: now
    },
    {
      user_id: testUserId1,
      mood_score: 6,
      notes: 'Average day',
      created_at: yesterday,
      updated_at: yesterday
    },
    {
      user_id: testUserId1,
      mood_score: 4,
      notes: 'Not my best day',
      created_at: twoDaysAgo,
      updated_at: twoDaysAgo
    },
    {
      user_id: testUserId1,
      mood_score: 7,
      notes: 'Week ago mood',
      created_at: oneWeekAgo,
      updated_at: oneWeekAgo
    },
    {
      user_id: testUserId2,
      mood_score: 9,
      notes: 'Different user entry',
      created_at: now,
      updated_at: now
    }
  ]).execute();
};

describe('getMoodEntries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all mood entries for a specific user', async () => {
    await createTestMoodEntries();

    const query: UserDataQuery = {
      user_id: testUserId1
    };

    const result = await getMoodEntries(query);

    expect(result).toHaveLength(4);
    
    // Verify all entries belong to the correct user
    result.forEach(entry => {
      expect(entry.user_id).toEqual(testUserId1);
      expect(entry.id).toBeDefined();
      expect(entry.mood_score).toBeGreaterThanOrEqual(1);
      expect(entry.mood_score).toBeLessThanOrEqual(10);
      expect(entry.created_at).toBeInstanceOf(Date);
      expect(entry.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return entries ordered by created_at descending (newest first)', async () => {
    await createTestMoodEntries();

    const query: UserDataQuery = {
      user_id: testUserId1
    };

    const result = await getMoodEntries(query);

    expect(result).toHaveLength(4);
    
    // Verify descending order
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].created_at >= result[i].created_at).toBe(true);
    }
  });

  it('should return empty array when user has no mood entries', async () => {
    const query: UserDataQuery = {
      user_id: 'nonexistent_user'
    };

    const result = await getMoodEntries(query);

    expect(result).toHaveLength(0);
  });

  it('should only return entries for the specified user', async () => {
    await createTestMoodEntries();

    const query: UserDataQuery = {
      user_id: testUserId2
    };

    const result = await getMoodEntries(query);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(testUserId2);
    expect(result[0].mood_score).toEqual(9);
    expect(result[0].notes).toEqual('Different user entry');
  });
});

describe('getMoodEntriesByDateRange', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return mood entries within the specified date range', async () => {
    await createTestMoodEntries();

    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const query: DateRangeQuery = {
      user_id: testUserId1,
      start_date: threeDaysAgo,
      end_date: now
    };

    const result = await getMoodEntriesByDateRange(query);

    expect(result).toHaveLength(3); // Should exclude the week-old entry
    
    // Verify all entries are within date range and belong to correct user
    result.forEach(entry => {
      expect(entry.user_id).toEqual(testUserId1);
      expect(entry.created_at >= threeDaysAgo).toBe(true);
      expect(entry.created_at <= now).toBe(true);
    });
  });

  it('should return entries ordered by created_at descending', async () => {
    await createTestMoodEntries();

    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const query: DateRangeQuery = {
      user_id: testUserId1,
      start_date: tenDaysAgo,
      end_date: now
    };

    const result = await getMoodEntriesByDateRange(query);

    expect(result).toHaveLength(4);
    
    // Verify descending order
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].created_at >= result[i].created_at).toBe(true);
    }
  });

  it('should return empty array when no entries exist in date range', async () => {
    await createTestMoodEntries();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const farFutureDate = new Date();
    farFutureDate.setDate(farFutureDate.getDate() + 20);

    const query: DateRangeQuery = {
      user_id: testUserId1,
      start_date: futureDate,
      end_date: farFutureDate
    };

    const result = await getMoodEntriesByDateRange(query);

    expect(result).toHaveLength(0);
  });

  it('should only return entries for the specified user within date range', async () => {
    await createTestMoodEntries();

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const query: DateRangeQuery = {
      user_id: testUserId2,
      start_date: yesterday,
      end_date: now
    };

    const result = await getMoodEntriesByDateRange(query);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(testUserId2);
    expect(result[0].mood_score).toEqual(9);
  });

  it('should handle exact date boundaries correctly', async () => {
    const specificDate = new Date('2024-01-15T12:00:00Z');
    
    await db.insert(moodEntriesTable).values([
      {
        user_id: testUserId1,
        mood_score: 5,
        notes: 'Boundary test',
        created_at: specificDate,
        updated_at: specificDate
      }
    ]).execute();

    // Query with exact same date as start and end
    const query: DateRangeQuery = {
      user_id: testUserId1,
      start_date: specificDate,
      end_date: specificDate
    };

    const result = await getMoodEntriesByDateRange(query);

    expect(result).toHaveLength(1);
    expect(result[0].mood_score).toEqual(5);
    expect(result[0].notes).toEqual('Boundary test');
  });

  it('should handle entries with null notes correctly', async () => {
    const now = new Date();
    
    await db.insert(moodEntriesTable).values([
      {
        user_id: testUserId1,
        mood_score: 7,
        notes: null,
        created_at: now,
        updated_at: now
      }
    ]).execute();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const query: DateRangeQuery = {
      user_id: testUserId1,
      start_date: yesterday,
      end_date: now
    };

    const result = await getMoodEntriesByDateRange(query);

    expect(result).toHaveLength(1);
    expect(result[0].notes).toBeNull();
    expect(result[0].mood_score).toEqual(7);
  });
});