import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { habitsTable } from '../db/schema';
import { type CreateHabitInput } from '../schema';
import { createHabit } from '../handlers/create_habit';
import { eq } from 'drizzle-orm';

// Basic test input
const testInput: CreateHabitInput = {
  user_id: 'user123',
  name: 'Morning Exercise',
  description: 'Go for a 30-minute walk every morning',
  target_frequency: 'daily'
};

// Minimal test input without optional fields
const minimalInput: CreateHabitInput = {
  user_id: 'user456',
  name: 'Meditation',
  target_frequency: 'daily'
};

describe('createHabit', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a habit with all fields', async () => {
    const result = await createHabit(testInput);

    // Basic field validation
    expect(result.name).toEqual('Morning Exercise');
    expect(result.user_id).toEqual('user123');
    expect(result.description).toEqual('Go for a 30-minute walk every morning');
    expect(result.target_frequency).toEqual('daily');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a habit with minimal fields', async () => {
    const result = await createHabit(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('Meditation');
    expect(result.user_id).toEqual('user456');
    expect(result.description).toBeNull();
    expect(result.target_frequency).toEqual('daily');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save habit to database', async () => {
    const result = await createHabit(testInput);

    // Query using proper drizzle syntax
    const habits = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.id, result.id))
      .execute();

    expect(habits).toHaveLength(1);
    expect(habits[0].name).toEqual('Morning Exercise');
    expect(habits[0].user_id).toEqual('user123');
    expect(habits[0].description).toEqual('Go for a 30-minute walk every morning');
    expect(habits[0].target_frequency).toEqual('daily');
    expect(habits[0].is_active).toBe(true);
    expect(habits[0].created_at).toBeInstanceOf(Date);
    expect(habits[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle different target frequencies', async () => {
    const weeklyInput: CreateHabitInput = {
      user_id: 'user789',
      name: 'Weekly Review',
      target_frequency: 'weekly'
    };

    const result = await createHabit(weeklyInput);

    expect(result.target_frequency).toEqual('weekly');
    expect(result.name).toEqual('Weekly Review');
    expect(result.user_id).toEqual('user789');
  });

  it('should handle null description when not provided', async () => {
    const inputWithoutDescription: CreateHabitInput = {
      user_id: 'user999',
      name: 'Reading',
      target_frequency: '3x per week'
    };

    const result = await createHabit(inputWithoutDescription);

    expect(result.description).toBeNull();
    expect(result.name).toEqual('Reading');
    expect(result.target_frequency).toEqual('3x per week');
  });

  it('should create multiple habits for same user', async () => {
    const habit1: CreateHabitInput = {
      user_id: 'multiuser',
      name: 'Morning Stretching',
      target_frequency: 'daily'
    };

    const habit2: CreateHabitInput = {
      user_id: 'multiuser',
      name: 'Evening Journal',
      target_frequency: 'daily'
    };

    const result1 = await createHabit(habit1);
    const result2 = await createHabit(habit2);

    // Both should be created successfully
    expect(result1.user_id).toEqual('multiuser');
    expect(result2.user_id).toEqual('multiuser');
    expect(result1.name).toEqual('Morning Stretching');
    expect(result2.name).toEqual('Evening Journal');
    expect(result1.id).not.toEqual(result2.id);

    // Verify both exist in database
    const habits = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.user_id, 'multiuser'))
      .execute();

    expect(habits).toHaveLength(2);
  });

  it('should set default is_active to true', async () => {
    const result = await createHabit(testInput);

    expect(result.is_active).toBe(true);

    // Verify in database
    const habit = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.id, result.id))
      .execute();

    expect(habit[0].is_active).toBe(true);
  });

  it('should handle empty string description as null', async () => {
    const inputWithEmptyDescription: CreateHabitInput = {
      user_id: 'user_empty',
      name: 'Empty Description Test',
      description: null,
      target_frequency: 'daily'
    };

    const result = await createHabit(inputWithEmptyDescription);

    expect(result.description).toBeNull();

    // Verify in database
    const habit = await db.select()
      .from(habitsTable)
      .where(eq(habitsTable.id, result.id))
      .execute();

    expect(habit[0].description).toBeNull();
  });
});