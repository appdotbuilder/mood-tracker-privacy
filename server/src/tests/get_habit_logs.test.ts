import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { habitLogsTable, habitsTable } from '../db/schema';
import { type UserDataQuery, type DateRangeQuery } from '../schema';
import { getHabitLogs, getHabitLogsByDateRange } from '../handlers/get_habit_logs';

const testUserId = 'test-user-123';

describe('getHabitLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no habit logs', async () => {
    const query: UserDataQuery = {
      user_id: 'non-existent-user'
    };

    const result = await getHabitLogs(query);

    expect(result).toEqual([]);
  });

  it('should return habit logs for a user', async () => {
    // Create a habit first
    const habitResult = await db.insert(habitsTable)
      .values({
        user_id: testUserId,
        name: 'Morning Exercise',
        description: 'Daily workout routine',
        target_frequency: 'daily'
      })
      .returning()
      .execute();

    const habit = habitResult[0];

    // Create habit logs
    const testTime1 = new Date('2024-01-01T08:00:00Z');
    const testTime2 = new Date('2024-01-02T08:30:00Z');

    await db.insert(habitLogsTable)
      .values([
        {
          habit_id: habit.id,
          user_id: testUserId,
          completed_at: testTime1,
          notes: 'Great workout today!'
        },
        {
          habit_id: habit.id,
          user_id: testUserId,
          completed_at: testTime2,
          notes: null
        }
      ])
      .execute();

    const query: UserDataQuery = {
      user_id: testUserId
    };

    const result = await getHabitLogs(query);

    expect(result).toHaveLength(2);
    
    // Results should be ordered by completed_at desc
    expect(result[0].completed_at).toEqual(testTime2);
    expect(result[0].habit_id).toEqual(habit.id);
    expect(result[0].user_id).toEqual(testUserId);
    expect(result[0].notes).toBeNull();

    expect(result[1].completed_at).toEqual(testTime1);
    expect(result[1].habit_id).toEqual(habit.id);
    expect(result[1].user_id).toEqual(testUserId);
    expect(result[1].notes).toEqual('Great workout today!');

    // Verify all required fields are present
    result.forEach(log => {
      expect(log.id).toBeDefined();
      expect(log.habit_id).toBeDefined();
      expect(log.user_id).toBeDefined();
      expect(log.completed_at).toBeInstanceOf(Date);
      expect(log.created_at).toBeInstanceOf(Date);
      expect(typeof log.notes === 'string' || log.notes === null).toBe(true);
    });
  });

  it('should only return logs for the specified user', async () => {
    const otherUserId = 'other-user-456';

    // Create habits for both users
    const habitResults = await db.insert(habitsTable)
      .values([
        {
          user_id: testUserId,
          name: 'User 1 Habit',
          target_frequency: 'daily'
        },
        {
          user_id: otherUserId,
          name: 'User 2 Habit',
          target_frequency: 'daily'
        }
      ])
      .returning()
      .execute();

    const [habit1, habit2] = habitResults;

    // Create logs for both users
    await db.insert(habitLogsTable)
      .values([
        {
          habit_id: habit1.id,
          user_id: testUserId,
          completed_at: new Date(),
          notes: 'User 1 log'
        },
        {
          habit_id: habit2.id,
          user_id: otherUserId,
          completed_at: new Date(),
          notes: 'User 2 log'
        }
      ])
      .execute();

    const query: UserDataQuery = {
      user_id: testUserId
    };

    const result = await getHabitLogs(query);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(testUserId);
    expect(result[0].notes).toEqual('User 1 log');
  });

  it('should handle multiple habits for the same user', async () => {
    // Create multiple habits
    const habitResults = await db.insert(habitsTable)
      .values([
        {
          user_id: testUserId,
          name: 'Exercise',
          target_frequency: 'daily'
        },
        {
          user_id: testUserId,
          name: 'Meditation',
          target_frequency: 'daily'
        }
      ])
      .returning()
      .execute();

    const [habit1, habit2] = habitResults;

    // Create logs for both habits
    await db.insert(habitLogsTable)
      .values([
        {
          habit_id: habit1.id,
          user_id: testUserId,
          completed_at: new Date('2024-01-01T08:00:00Z'),
          notes: 'Exercise completed'
        },
        {
          habit_id: habit2.id,
          user_id: testUserId,
          completed_at: new Date('2024-01-01T09:00:00Z'),
          notes: 'Meditation completed'
        }
      ])
      .execute();

    const query: UserDataQuery = {
      user_id: testUserId
    };

    const result = await getHabitLogs(query);

    expect(result).toHaveLength(2);
    
    // Verify we have logs for both habits
    const habitIds = result.map(log => log.habit_id);
    expect(habitIds).toContain(habit1.id);
    expect(habitIds).toContain(habit2.id);
  });
});

describe('getHabitLogsByDateRange', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no logs exist in date range', async () => {
    const query: DateRangeQuery = {
      user_id: testUserId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getHabitLogsByDateRange(query);

    expect(result).toEqual([]);
  });

  it('should return habit logs within date range', async () => {
    // Create a habit
    const habitResult = await db.insert(habitsTable)
      .values({
        user_id: testUserId,
        name: 'Daily Reading',
        target_frequency: 'daily'
      })
      .returning()
      .execute();

    const habit = habitResult[0];

    // Create logs with different dates
    const inRangeDate1 = new Date('2024-01-15T08:00:00Z');
    const inRangeDate2 = new Date('2024-01-20T08:00:00Z');
    const outOfRangeDate = new Date('2024-02-15T08:00:00Z');

    await db.insert(habitLogsTable)
      .values([
        {
          habit_id: habit.id,
          user_id: testUserId,
          completed_at: inRangeDate1,
          notes: 'In range 1'
        },
        {
          habit_id: habit.id,
          user_id: testUserId,
          completed_at: inRangeDate2,
          notes: 'In range 2'
        },
        {
          habit_id: habit.id,
          user_id: testUserId,
          completed_at: outOfRangeDate,
          notes: 'Out of range'
        }
      ])
      .execute();

    const query: DateRangeQuery = {
      user_id: testUserId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getHabitLogsByDateRange(query);

    expect(result).toHaveLength(2);
    
    // Results should be ordered by completed_at desc
    expect(result[0].completed_at).toEqual(inRangeDate2);
    expect(result[0].notes).toEqual('In range 2');
    
    expect(result[1].completed_at).toEqual(inRangeDate1);
    expect(result[1].notes).toEqual('In range 1');

    // Verify no out-of-range logs are included
    const notes = result.map(log => log.notes);
    expect(notes).not.toContain('Out of range');
  });

  it('should include logs at date range boundaries', async () => {
    // Create a habit
    const habitResult = await db.insert(habitsTable)
      .values({
        user_id: testUserId,
        name: 'Boundary Test Habit',
        target_frequency: 'daily'
      })
      .returning()
      .execute();

    const habit = habitResult[0];

    const startBoundary = new Date('2024-01-01T00:00:00Z');
    const endBoundary = new Date('2024-01-31T23:59:59Z');

    await db.insert(habitLogsTable)
      .values([
        {
          habit_id: habit.id,
          user_id: testUserId,
          completed_at: startBoundary,
          notes: 'Start boundary'
        },
        {
          habit_id: habit.id,
          user_id: testUserId,
          completed_at: endBoundary,
          notes: 'End boundary'
        }
      ])
      .execute();

    const query: DateRangeQuery = {
      user_id: testUserId,
      start_date: new Date('2024-01-01T00:00:00Z'),
      end_date: new Date('2024-01-31T23:59:59Z')
    };

    const result = await getHabitLogsByDateRange(query);

    expect(result).toHaveLength(2);
    
    const notes = result.map(log => log.notes);
    expect(notes).toContain('Start boundary');
    expect(notes).toContain('End boundary');
  });

  it('should filter by user_id within date range', async () => {
    const otherUserId = 'other-user-789';

    // Create habits for both users
    const habitResults = await db.insert(habitsTable)
      .values([
        {
          user_id: testUserId,
          name: 'User 1 Habit',
          target_frequency: 'daily'
        },
        {
          user_id: otherUserId,
          name: 'User 2 Habit',
          target_frequency: 'daily'
        }
      ])
      .returning()
      .execute();

    const [habit1, habit2] = habitResults;

    const testDate = new Date('2024-01-15T08:00:00Z');

    // Create logs for both users on the same date
    await db.insert(habitLogsTable)
      .values([
        {
          habit_id: habit1.id,
          user_id: testUserId,
          completed_at: testDate,
          notes: 'Target user log'
        },
        {
          habit_id: habit2.id,
          user_id: otherUserId,
          completed_at: testDate,
          notes: 'Other user log'
        }
      ])
      .execute();

    const query: DateRangeQuery = {
      user_id: testUserId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getHabitLogsByDateRange(query);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(testUserId);
    expect(result[0].notes).toEqual('Target user log');
  });

  it('should handle single day date range', async () => {
    // Create a habit
    const habitResult = await db.insert(habitsTable)
      .values({
        user_id: testUserId,
        name: 'Single Day Habit',
        target_frequency: 'daily'
      })
      .returning()
      .execute();

    const habit = habitResult[0];

    const targetDate = new Date('2024-01-15');
    const beforeDate = new Date('2024-01-14');
    const afterDate = new Date('2024-01-16');

    await db.insert(habitLogsTable)
      .values([
        {
          habit_id: habit.id,
          user_id: testUserId,
          completed_at: beforeDate,
          notes: 'Before target'
        },
        {
          habit_id: habit.id,
          user_id: testUserId,
          completed_at: targetDate,
          notes: 'On target date'
        },
        {
          habit_id: habit.id,
          user_id: testUserId,
          completed_at: afterDate,
          notes: 'After target'
        }
      ])
      .execute();

    const query: DateRangeQuery = {
      user_id: testUserId,
      start_date: targetDate,
      end_date: targetDate
    };

    const result = await getHabitLogsByDateRange(query);

    expect(result).toHaveLength(1);
    expect(result[0].notes).toEqual('On target date');
  });
});