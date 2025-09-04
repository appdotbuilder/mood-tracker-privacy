import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { habitsTable } from '../db/schema';
import { type UserDataQuery, type CreateHabitInput } from '../schema';
import { getHabits, getActiveHabits } from '../handlers/get_habits';

// Test data
const testUserId = 'user123';
const otherUserId = 'user456';

const testQuery: UserDataQuery = {
  user_id: testUserId
};

const activeHabitInput: CreateHabitInput = {
  user_id: testUserId,
  name: 'Morning Exercise',
  description: 'Daily morning workout routine',
  target_frequency: 'daily'
};

const inactiveHabitInput: CreateHabitInput = {
  user_id: testUserId,
  name: 'Evening Reading',
  description: 'Read for 30 minutes before bed',
  target_frequency: 'daily'
};

const otherUserHabitInput: CreateHabitInput = {
  user_id: otherUserId,
  name: 'Meditation',
  description: 'Daily meditation practice',
  target_frequency: 'daily'
};

describe('getHabits', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all habits for a user', async () => {
    // Create test habits
    const activeHabit = await db.insert(habitsTable)
      .values(activeHabitInput)
      .returning()
      .execute();

    const inactiveHabit = await db.insert(habitsTable)
      .values({
        ...inactiveHabitInput,
        is_active: false
      })
      .returning()
      .execute();

    // Create habit for different user
    await db.insert(habitsTable)
      .values(otherUserHabitInput)
      .returning()
      .execute();

    const result = await getHabits(testQuery);

    // Should return 2 habits for the test user
    expect(result).toHaveLength(2);
    
    // Verify it includes both active and inactive habits
    const habitNames = result.map(h => h.name).sort();
    expect(habitNames).toEqual(['Evening Reading', 'Morning Exercise']);

    // Verify all habits belong to the correct user
    result.forEach(habit => {
      expect(habit.user_id).toEqual(testUserId);
    });

    // Verify habit details
    const morningExercise = result.find(h => h.name === 'Morning Exercise');
    expect(morningExercise).toBeDefined();
    expect(morningExercise!.description).toEqual('Daily morning workout routine');
    expect(morningExercise!.target_frequency).toEqual('daily');
    expect(morningExercise!.is_active).toEqual(true);
    expect(morningExercise!.id).toBeDefined();
    expect(morningExercise!.created_at).toBeInstanceOf(Date);
    expect(morningExercise!.updated_at).toBeInstanceOf(Date);
  });

  it('should return empty array for user with no habits', async () => {
    const result = await getHabits(testQuery);
    expect(result).toHaveLength(0);
  });

  it('should return habits ordered by created_at descending', async () => {
    // Create multiple habits with slight delay to ensure different timestamps
    const firstHabit = await db.insert(habitsTable)
      .values({
        ...activeHabitInput,
        name: 'First Habit'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondHabit = await db.insert(habitsTable)
      .values({
        ...inactiveHabitInput,
        name: 'Second Habit'
      })
      .returning()
      .execute();

    const result = await getHabits(testQuery);

    expect(result).toHaveLength(2);
    // Second habit should come first (most recent)
    expect(result[0].name).toEqual('Second Habit');
    expect(result[1].name).toEqual('First Habit');
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
  });

  it('should handle habits with null description', async () => {
    await db.insert(habitsTable)
      .values({
        user_id: testUserId,
        name: 'Simple Habit',
        description: null,
        target_frequency: 'weekly'
      })
      .returning()
      .execute();

    const result = await getHabits(testQuery);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Simple Habit');
    expect(result[0].description).toBeNull();
    expect(result[0].target_frequency).toEqual('weekly');
  });
});

describe('getActiveHabits', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return only active habits for a user', async () => {
    // Create active habit
    await db.insert(habitsTable)
      .values(activeHabitInput)
      .returning()
      .execute();

    // Create inactive habit
    await db.insert(habitsTable)
      .values({
        ...inactiveHabitInput,
        is_active: false
      })
      .returning()
      .execute();

    // Create active habit for different user
    await db.insert(habitsTable)
      .values(otherUserHabitInput)
      .returning()
      .execute();

    const result = await getActiveHabits(testQuery);

    // Should return only 1 active habit for the test user
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Morning Exercise');
    expect(result[0].is_active).toEqual(true);
    expect(result[0].user_id).toEqual(testUserId);
  });

  it('should return empty array when user has no active habits', async () => {
    // Create only inactive habits
    await db.insert(habitsTable)
      .values({
        ...inactiveHabitInput,
        is_active: false
      })
      .returning()
      .execute();

    const result = await getActiveHabits(testQuery);
    expect(result).toHaveLength(0);
  });

  it('should return empty array for user with no habits at all', async () => {
    const result = await getActiveHabits(testQuery);
    expect(result).toHaveLength(0);
  });

  it('should return active habits ordered by created_at descending', async () => {
    // Create multiple active habits
    const firstActiveHabit = await db.insert(habitsTable)
      .values({
        ...activeHabitInput,
        name: 'First Active Habit'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondActiveHabit = await db.insert(habitsTable)
      .values({
        user_id: testUserId,
        name: 'Second Active Habit',
        description: 'Another active habit',
        target_frequency: 'weekly'
      })
      .returning()
      .execute();

    const result = await getActiveHabits(testQuery);

    expect(result).toHaveLength(2);
    // Second habit should come first (most recent)
    expect(result[0].name).toEqual('Second Active Habit');
    expect(result[1].name).toEqual('First Active Habit');
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
    
    // Verify both are active
    result.forEach(habit => {
      expect(habit.is_active).toEqual(true);
    });
  });

  it('should handle mixed active and inactive habits correctly', async () => {
    // Create habits in mixed order
    await db.insert(habitsTable)
      .values({
        ...activeHabitInput,
        name: 'Active Habit 1'
      })
      .returning()
      .execute();

    await db.insert(habitsTable)
      .values({
        user_id: testUserId,
        name: 'Inactive Habit',
        description: 'This is inactive',
        target_frequency: 'daily',
        is_active: false
      })
      .returning()
      .execute();

    await db.insert(habitsTable)
      .values({
        user_id: testUserId,
        name: 'Active Habit 2',
        description: 'This is active',
        target_frequency: 'weekly'
      })
      .returning()
      .execute();

    const result = await getActiveHabits(testQuery);

    expect(result).toHaveLength(2);
    const habitNames = result.map(h => h.name).sort();
    expect(habitNames).toEqual(['Active Habit 1', 'Active Habit 2']);
    
    // Verify all returned habits are active
    result.forEach(habit => {
      expect(habit.is_active).toEqual(true);
      expect(habit.user_id).toEqual(testUserId);
    });
  });
});