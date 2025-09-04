import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { habitLogsTable, habitsTable } from '../db/schema';
import { type CreateHabitLogInput } from '../schema';
import { createHabitLog } from '../handlers/create_habit_log';
import { eq } from 'drizzle-orm';

describe('createHabitLog', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create prerequisite habit for testing
  const createTestHabit = async (userId: string = 'test-user-1') => {
    const result = await db.insert(habitsTable)
      .values({
        user_id: userId,
        name: 'Daily Exercise',
        description: 'Go for a 30-minute walk',
        target_frequency: 'daily',
        is_active: true
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should create a habit log', async () => {
    const habit = await createTestHabit();
    
    const testInput: CreateHabitLogInput = {
      habit_id: habit.id,
      user_id: 'test-user-1',
      completed_at: new Date('2024-01-15T10:30:00Z'),
      notes: 'Completed morning walk in the park'
    };

    const result = await createHabitLog(testInput);

    // Basic field validation
    expect(result.habit_id).toEqual(habit.id);
    expect(result.user_id).toEqual('test-user-1');
    expect(result.completed_at).toEqual(new Date('2024-01-15T10:30:00Z'));
    expect(result.notes).toEqual('Completed morning walk in the park');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a habit log with default completed_at when not provided', async () => {
    const habit = await createTestHabit();
    const beforeCreate = new Date();
    
    const testInput: CreateHabitLogInput = {
      habit_id: habit.id,
      user_id: 'test-user-1',
      notes: 'Completed workout session'
    };

    const result = await createHabitLog(testInput);

    expect(result.habit_id).toEqual(habit.id);
    expect(result.user_id).toEqual('test-user-1');
    expect(result.notes).toEqual('Completed workout session');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.completed_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
  });

  it('should create a habit log with null notes when not provided', async () => {
    const habit = await createTestHabit();
    
    const testInput: CreateHabitLogInput = {
      habit_id: habit.id,
      user_id: 'test-user-1'
    };

    const result = await createHabitLog(testInput);

    expect(result.habit_id).toEqual(habit.id);
    expect(result.user_id).toEqual('test-user-1');
    expect(result.notes).toBeNull();
    expect(result.completed_at).toBeInstanceOf(Date);
  });

  it('should save habit log to database', async () => {
    const habit = await createTestHabit();
    
    const testInput: CreateHabitLogInput = {
      habit_id: habit.id,
      user_id: 'test-user-1',
      completed_at: new Date('2024-01-15T14:00:00Z'),
      notes: 'Afternoon meditation session'
    };

    const result = await createHabitLog(testInput);

    // Query the database to verify the record was saved
    const habitLogs = await db.select()
      .from(habitLogsTable)
      .where(eq(habitLogsTable.id, result.id))
      .execute();

    expect(habitLogs).toHaveLength(1);
    expect(habitLogs[0].habit_id).toEqual(habit.id);
    expect(habitLogs[0].user_id).toEqual('test-user-1');
    expect(habitLogs[0].completed_at).toEqual(new Date('2024-01-15T14:00:00Z'));
    expect(habitLogs[0].notes).toEqual('Afternoon meditation session');
    expect(habitLogs[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple habit logs for the same habit', async () => {
    const habit = await createTestHabit();
    
    const testInput1: CreateHabitLogInput = {
      habit_id: habit.id,
      user_id: 'test-user-1',
      completed_at: new Date('2024-01-15T08:00:00Z'),
      notes: 'Morning session'
    };

    const testInput2: CreateHabitLogInput = {
      habit_id: habit.id,
      user_id: 'test-user-1',
      completed_at: new Date('2024-01-15T18:00:00Z'),
      notes: 'Evening session'
    };

    const result1 = await createHabitLog(testInput1);
    const result2 = await createHabitLog(testInput2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.habit_id).toEqual(habit.id);
    expect(result2.habit_id).toEqual(habit.id);
    expect(result1.notes).toEqual('Morning session');
    expect(result2.notes).toEqual('Evening session');
  });

  it('should throw error when habit does not exist', async () => {
    const testInput: CreateHabitLogInput = {
      habit_id: 999, // Non-existent habit ID
      user_id: 'test-user-1',
      notes: 'This should fail'
    };

    expect(createHabitLog(testInput)).rejects.toThrow(/Habit with id 999 not found/i);
  });

  it('should throw error when habit belongs to different user', async () => {
    const habit = await createTestHabit('different-user');
    
    const testInput: CreateHabitLogInput = {
      habit_id: habit.id,
      user_id: 'test-user-1', // Different user than the habit owner
      notes: 'This should fail'
    };

    expect(createHabitLog(testInput)).rejects.toThrow(/does not belong to user test-user-1/i);
  });

  it('should allow logging for inactive habits', async () => {
    // Create inactive habit
    const inactiveHabit = await db.insert(habitsTable)
      .values({
        user_id: 'test-user-1',
        name: 'Old Habit',
        description: 'Previously tracked habit',
        target_frequency: 'daily',
        is_active: false
      })
      .returning()
      .execute();

    const testInput: CreateHabitLogInput = {
      habit_id: inactiveHabit[0].id,
      user_id: 'test-user-1',
      notes: 'Still completed despite being inactive'
    };

    const result = await createHabitLog(testInput);

    expect(result.habit_id).toEqual(inactiveHabit[0].id);
    expect(result.user_id).toEqual('test-user-1');
    expect(result.notes).toEqual('Still completed despite being inactive');
  });
});