import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { remindersTable } from '../db/schema';
import { type UserDataQuery } from '../schema';
import { getReminders, getActiveReminders } from '../handlers/get_reminders';

describe('getReminders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testUserId = 'user123';
  const otherUserId = 'user456';

  const testQuery: UserDataQuery = {
    user_id: testUserId
  };

  it('should return empty array when no reminders exist', async () => {
    const result = await getReminders(testQuery);
    expect(result).toEqual([]);
  });

  it('should fetch all reminders for a specific user', async () => {
    // Create test reminders
    await db.insert(remindersTable).values([
      {
        user_id: testUserId,
        title: 'Take Morning Medication',
        message: 'Don\'t forget your pills',
        reminder_time: '08:00',
        days_of_week: [1, 2, 3, 4, 5], // Monday to Friday
        reminder_type: 'medication',
        target_id: 1,
        is_active: true
      },
      {
        user_id: testUserId,
        title: 'Mood Check-in',
        message: null,
        reminder_time: '20:00',
        days_of_week: [0, 1, 2, 3, 4, 5, 6], // Every day
        reminder_type: 'mood',
        target_id: null,
        is_active: false
      },
      {
        user_id: otherUserId,
        title: 'Other User Reminder',
        message: 'Should not appear',
        reminder_time: '12:00',
        days_of_week: [0, 6], // Weekends
        reminder_type: 'general',
        target_id: null,
        is_active: true
      }
    ]).execute();

    const result = await getReminders(testQuery);

    expect(result).toHaveLength(2);

    // Verify first reminder
    const firstReminder = result.find(r => r.title === 'Take Morning Medication');
    expect(firstReminder).toBeDefined();
    expect(firstReminder!.user_id).toEqual(testUserId);
    expect(firstReminder!.message).toEqual('Don\'t forget your pills');
    expect(firstReminder!.reminder_time).toEqual('08:00');
    expect(firstReminder!.days_of_week).toEqual([1, 2, 3, 4, 5]);
    expect(firstReminder!.reminder_type).toEqual('medication');
    expect(firstReminder!.target_id).toEqual(1);
    expect(firstReminder!.is_active).toEqual(true);
    expect(firstReminder!.created_at).toBeInstanceOf(Date);
    expect(firstReminder!.updated_at).toBeInstanceOf(Date);

    // Verify second reminder
    const secondReminder = result.find(r => r.title === 'Mood Check-in');
    expect(secondReminder).toBeDefined();
    expect(secondReminder!.user_id).toEqual(testUserId);
    expect(secondReminder!.message).toBeNull();
    expect(secondReminder!.reminder_time).toEqual('20:00');
    expect(secondReminder!.days_of_week).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(secondReminder!.reminder_type).toEqual('mood');
    expect(secondReminder!.target_id).toBeNull();
    expect(secondReminder!.is_active).toEqual(false);

    // Verify other user's reminder is not included
    const otherUserReminder = result.find(r => r.title === 'Other User Reminder');
    expect(otherUserReminder).toBeUndefined();
  });

  it('should handle different reminder types correctly', async () => {
    // Create reminders of different types
    await db.insert(remindersTable).values([
      {
        user_id: testUserId,
        title: 'Medication Reminder',
        reminder_time: '08:00',
        days_of_week: [1, 3, 5],
        reminder_type: 'medication',
        target_id: 123,
        is_active: true
      },
      {
        user_id: testUserId,
        title: 'Supplement Reminder',
        reminder_time: '09:00',
        days_of_week: [0, 6],
        reminder_type: 'supplement',
        target_id: 456,
        is_active: true
      },
      {
        user_id: testUserId,
        title: 'Habit Reminder',
        reminder_time: '18:00',
        days_of_week: [1, 2, 3, 4, 5],
        reminder_type: 'habit',
        target_id: 789,
        is_active: true
      },
      {
        user_id: testUserId,
        title: 'General Reminder',
        reminder_time: '12:00',
        days_of_week: [2, 4],
        reminder_type: 'general',
        target_id: null,
        is_active: true
      }
    ]).execute();

    const result = await getReminders(testQuery);

    expect(result).toHaveLength(4);
    expect(result.map(r => r.reminder_type).sort()).toEqual(['general', 'habit', 'medication', 'supplement']);
  });
});

describe('getActiveReminders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testUserId = 'user123';

  const testQuery: UserDataQuery = {
    user_id: testUserId
  };

  it('should return empty array when no active reminders exist', async () => {
    // Create inactive reminder
    await db.insert(remindersTable).values({
      user_id: testUserId,
      title: 'Inactive Reminder',
      reminder_time: '10:00',
      days_of_week: [1, 2, 3],
      reminder_type: 'general',
      is_active: false
    }).execute();

    const result = await getActiveReminders(testQuery);
    expect(result).toEqual([]);
  });

  it('should fetch only active reminders for a user', async () => {
    // Create mix of active and inactive reminders
    await db.insert(remindersTable).values([
      {
        user_id: testUserId,
        title: 'Active Medication',
        reminder_time: '08:00',
        days_of_week: [1, 2, 3, 4, 5],
        reminder_type: 'medication',
        target_id: 1,
        is_active: true
      },
      {
        user_id: testUserId,
        title: 'Inactive Mood',
        reminder_time: '20:00',
        days_of_week: [0, 6],
        reminder_type: 'mood',
        is_active: false
      },
      {
        user_id: testUserId,
        title: 'Active Supplement',
        reminder_time: '09:00',
        days_of_week: [1, 3, 5],
        reminder_type: 'supplement',
        target_id: 2,
        is_active: true
      }
    ]).execute();

    const result = await getActiveReminders(testQuery);

    expect(result).toHaveLength(2);
    
    const titles = result.map(r => r.title);
    expect(titles).toContain('Active Medication');
    expect(titles).toContain('Active Supplement');
    expect(titles).not.toContain('Inactive Mood');

    // Verify all returned reminders are active
    result.forEach(reminder => {
      expect(reminder.is_active).toEqual(true);
      expect(reminder.user_id).toEqual(testUserId);
      expect(reminder.created_at).toBeInstanceOf(Date);
      expect(reminder.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should handle days_of_week array correctly', async () => {
    // Create reminder with complex days_of_week pattern
    await db.insert(remindersTable).values({
      user_id: testUserId,
      title: 'Weekend Reminder',
      reminder_time: '10:00',
      days_of_week: [0, 6], // Sunday and Saturday
      reminder_type: 'habit',
      target_id: 5,
      is_active: true
    }).execute();

    const result = await getActiveReminders(testQuery);

    expect(result).toHaveLength(1);
    expect(result[0].days_of_week).toEqual([0, 6]);
    expect(Array.isArray(result[0].days_of_week)).toBe(true);
  });

  it('should not return active reminders for other users', async () => {
    const otherUserId = 'user999';

    // Create active reminders for different users
    await db.insert(remindersTable).values([
      {
        user_id: testUserId,
        title: 'My Active Reminder',
        reminder_time: '08:00',
        days_of_week: [1, 2, 3],
        reminder_type: 'medication',
        is_active: true
      },
      {
        user_id: otherUserId,
        title: 'Other User Active Reminder',
        reminder_time: '09:00',
        days_of_week: [4, 5, 6],
        reminder_type: 'supplement',
        is_active: true
      }
    ]).execute();

    const result = await getActiveReminders(testQuery);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('My Active Reminder');
    expect(result[0].user_id).toEqual(testUserId);
  });
});