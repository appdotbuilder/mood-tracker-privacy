import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { remindersTable } from '../db/schema';
import { type CreateReminderInput } from '../schema';
import { createReminder } from '../handlers/create_reminder';
import { eq } from 'drizzle-orm';

// Simple test input for general reminder
const testInput: CreateReminderInput = {
  user_id: 'user123',
  title: 'Daily Mood Check',
  message: 'Remember to log your mood today',
  reminder_time: '09:00',
  days_of_week: [1, 2, 3, 4, 5], // Monday to Friday
  reminder_type: 'mood',
  target_id: null
};

// Test input for medication reminder with target_id
const medicationReminderInput: CreateReminderInput = {
  user_id: 'user456',
  title: 'Take Medication',
  message: 'Don\'t forget your morning medication',
  reminder_time: '08:30',
  days_of_week: [0, 1, 2, 3, 4, 5, 6], // Every day
  reminder_type: 'medication',
  target_id: 123
};

describe('createReminder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a reminder with all fields', async () => {
    const result = await createReminder(testInput);

    // Basic field validation
    expect(result.user_id).toEqual('user123');
    expect(result.title).toEqual('Daily Mood Check');
    expect(result.message).toEqual('Remember to log your mood today');
    expect(result.reminder_time).toEqual('09:00');
    expect(result.days_of_week).toEqual([1, 2, 3, 4, 5]);
    expect(result.reminder_type).toEqual('mood');
    expect(result.target_id).toBeNull();
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save reminder to database', async () => {
    const result = await createReminder(testInput);

    // Query using proper drizzle syntax
    const reminders = await db.select()
      .from(remindersTable)
      .where(eq(remindersTable.id, result.id))
      .execute();

    expect(reminders).toHaveLength(1);
    const savedReminder = reminders[0];
    expect(savedReminder.user_id).toEqual('user123');
    expect(savedReminder.title).toEqual('Daily Mood Check');
    expect(savedReminder.message).toEqual('Remember to log your mood today');
    expect(savedReminder.reminder_time).toEqual('09:00');
    expect(savedReminder.days_of_week).toEqual([1, 2, 3, 4, 5]);
    expect(savedReminder.reminder_type).toEqual('mood');
    expect(savedReminder.target_id).toBeNull();
    expect(savedReminder.is_active).toBe(true);
    expect(savedReminder.created_at).toBeInstanceOf(Date);
    expect(savedReminder.updated_at).toBeInstanceOf(Date);
  });

  it('should create reminder with target_id for medication type', async () => {
    const result = await createReminder(medicationReminderInput);

    expect(result.user_id).toEqual('user456');
    expect(result.title).toEqual('Take Medication');
    expect(result.reminder_type).toEqual('medication');
    expect(result.target_id).toEqual(123);
    expect(result.days_of_week).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(result.reminder_time).toEqual('08:30');
    expect(result.is_active).toBe(true);
  });

  it('should handle minimal input with optional fields', async () => {
    const minimalInput: CreateReminderInput = {
      user_id: 'user789',
      title: 'General Reminder',
      reminder_time: '20:00',
      days_of_week: [6, 0], // Weekend only
      reminder_type: 'general'
    };

    const result = await createReminder(minimalInput);

    expect(result.user_id).toEqual('user789');
    expect(result.title).toEqual('General Reminder');
    expect(result.message).toBeNull();
    expect(result.target_id).toBeNull();
    expect(result.reminder_time).toEqual('20:00');
    expect(result.days_of_week).toEqual([6, 0]);
    expect(result.reminder_type).toEqual('general');
    expect(result.is_active).toBe(true);
  });

  it('should handle different reminder types correctly', async () => {
    const reminderTypes = ['mood', 'medication', 'supplement', 'habit', 'general'] as const;
    
    for (const type of reminderTypes) {
      const input: CreateReminderInput = {
        user_id: `user_${type}`,
        title: `${type} reminder`,
        reminder_time: '12:00',
        days_of_week: [1],
        reminder_type: type,
        target_id: type === 'general' || type === 'mood' ? null : 456
      };

      const result = await createReminder(input);
      expect(result.reminder_type).toEqual(type);
      expect(result.user_id).toEqual(`user_${type}`);
      expect(result.title).toEqual(`${type} reminder`);
    }
  });

  it('should handle complex days_of_week arrays', async () => {
    const complexSchedules = [
      [1, 3, 5], // Monday, Wednesday, Friday
      [0, 6], // Weekends only
      [0, 1, 2, 3, 4, 5, 6], // Every day
      [2], // Tuesday only
      [] // No days (edge case)
    ];

    for (const schedule of complexSchedules) {
      const input: CreateReminderInput = {
        user_id: 'schedule_user',
        title: 'Schedule Test',
        reminder_time: '15:30',
        days_of_week: schedule,
        reminder_type: 'general'
      };

      const result = await createReminder(input);
      expect(result.days_of_week).toEqual(schedule);
    }
  });

  it('should handle different time formats correctly', async () => {
    const times = ['00:00', '12:30', '23:59', '06:15'];

    for (const time of times) {
      const input: CreateReminderInput = {
        user_id: 'time_user',
        title: 'Time Test',
        reminder_time: time,
        days_of_week: [1],
        reminder_type: 'general'
      };

      const result = await createReminder(input);
      expect(result.reminder_time).toEqual(time);
    }
  });
});