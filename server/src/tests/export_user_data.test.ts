import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  moodEntriesTable,
  medicationsTable,
  medicationLogsTable,
  supplementsTable,
  supplementLogsTable,
  habitsTable,
  habitLogsTable,
  remindersTable
} from '../db/schema';
import { type UserDataQuery } from '../schema';
import { exportUserData } from '../handlers/export_user_data';

// Test data for comprehensive export testing
const testUserId = 'user123';
const otherUserId = 'user456';

describe('exportUserData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should export empty data for user with no records', async () => {
    const query: UserDataQuery = { user_id: testUserId };
    const result = await exportUserData(query);

    expect(result.mood_entries).toHaveLength(0);
    expect(result.medications).toHaveLength(0);
    expect(result.medication_logs).toHaveLength(0);
    expect(result.supplements).toHaveLength(0);
    expect(result.supplement_logs).toHaveLength(0);
    expect(result.habits).toHaveLength(0);
    expect(result.habit_logs).toHaveLength(0);
    expect(result.reminders).toHaveLength(0);
    expect(result.exported_at).toBeInstanceOf(Date);
  });

  it('should export all mood entries for a user', async () => {
    // Create test mood entries
    await db.insert(moodEntriesTable).values([
      {
        user_id: testUserId,
        mood_score: 8,
        notes: 'Feeling great today'
      },
      {
        user_id: testUserId,
        mood_score: 6,
        notes: null
      },
      {
        user_id: otherUserId, // Different user - should not be included
        mood_score: 7,
        notes: 'Other user mood'
      }
    ]).execute();

    const query: UserDataQuery = { user_id: testUserId };
    const result = await exportUserData(query);

    expect(result.mood_entries).toHaveLength(2);
    expect(result.mood_entries[0].user_id).toBe(testUserId);
    expect(result.mood_entries[0].mood_score).toBe(8);
    expect(result.mood_entries[0].notes).toBe('Feeling great today');
    expect(result.mood_entries[1].mood_score).toBe(6);
    expect(result.mood_entries[1].notes).toBeNull();
  });

  it('should export all medications and medication logs for a user', async () => {
    // Create test medications
    const medications = await db.insert(medicationsTable).values([
      {
        user_id: testUserId,
        name: 'Medication A',
        dosage: '10mg',
        frequency: 'daily'
      },
      {
        user_id: testUserId,
        name: 'Medication B',
        dosage: null,
        frequency: 'as needed'
      },
      {
        user_id: otherUserId, // Different user
        name: 'Other Medication',
        dosage: '5mg',
        frequency: 'daily'
      }
    ]).returning().execute();

    // Create medication logs
    await db.insert(medicationLogsTable).values([
      {
        medication_id: medications[0].id,
        user_id: testUserId,
        notes: 'Taken with breakfast'
      },
      {
        medication_id: medications[1].id,
        user_id: testUserId,
        notes: null
      },
      {
        medication_id: medications[2].id,
        user_id: otherUserId, // Different user
        notes: 'Other user log'
      }
    ]).execute();

    const query: UserDataQuery = { user_id: testUserId };
    const result = await exportUserData(query);

    expect(result.medications).toHaveLength(2);
    expect(result.medications[0].name).toBe('Medication A');
    expect(result.medications[0].dosage).toBe('10mg');
    expect(result.medications[1].name).toBe('Medication B');
    expect(result.medications[1].dosage).toBeNull();

    expect(result.medication_logs).toHaveLength(2);
    expect(result.medication_logs[0].user_id).toBe(testUserId);
    expect(result.medication_logs[0].notes).toBe('Taken with breakfast');
    expect(result.medication_logs[1].notes).toBeNull();
  });

  it('should export all supplements and supplement logs for a user', async () => {
    // Create test supplements
    const supplements = await db.insert(supplementsTable).values([
      {
        user_id: testUserId,
        name: 'Vitamin D',
        dosage: '1000 IU',
        frequency: 'daily'
      },
      {
        user_id: otherUserId, // Different user
        name: 'Other Vitamin',
        dosage: '500mg',
        frequency: 'daily'
      }
    ]).returning().execute();

    // Create supplement logs
    await db.insert(supplementLogsTable).values([
      {
        supplement_id: supplements[0].id,
        user_id: testUserId,
        notes: 'With morning coffee'
      },
      {
        supplement_id: supplements[1].id,
        user_id: otherUserId, // Different user
        notes: 'Other user log'
      }
    ]).execute();

    const query: UserDataQuery = { user_id: testUserId };
    const result = await exportUserData(query);

    expect(result.supplements).toHaveLength(1);
    expect(result.supplements[0].name).toBe('Vitamin D');
    expect(result.supplements[0].dosage).toBe('1000 IU');

    expect(result.supplement_logs).toHaveLength(1);
    expect(result.supplement_logs[0].user_id).toBe(testUserId);
    expect(result.supplement_logs[0].notes).toBe('With morning coffee');
  });

  it('should export all habits and habit logs for a user', async () => {
    // Create test habits
    const habits = await db.insert(habitsTable).values([
      {
        user_id: testUserId,
        name: 'Exercise',
        description: 'Daily workout routine',
        target_frequency: 'daily'
      },
      {
        user_id: testUserId,
        name: 'Meditation',
        description: null,
        target_frequency: 'daily'
      },
      {
        user_id: otherUserId, // Different user
        name: 'Other Habit',
        description: 'Other user habit',
        target_frequency: 'weekly'
      }
    ]).returning().execute();

    // Create habit logs
    await db.insert(habitLogsTable).values([
      {
        habit_id: habits[0].id,
        user_id: testUserId,
        notes: '30 minutes cardio'
      },
      {
        habit_id: habits[1].id,
        user_id: testUserId,
        notes: null
      },
      {
        habit_id: habits[2].id,
        user_id: otherUserId, // Different user
        notes: 'Other user log'
      }
    ]).execute();

    const query: UserDataQuery = { user_id: testUserId };
    const result = await exportUserData(query);

    expect(result.habits).toHaveLength(2);
    expect(result.habits[0].name).toBe('Exercise');
    expect(result.habits[0].description).toBe('Daily workout routine');
    expect(result.habits[1].name).toBe('Meditation');
    expect(result.habits[1].description).toBeNull();

    expect(result.habit_logs).toHaveLength(2);
    expect(result.habit_logs[0].user_id).toBe(testUserId);
    expect(result.habit_logs[0].notes).toBe('30 minutes cardio');
    expect(result.habit_logs[1].notes).toBeNull();
  });

  it('should export all reminders for a user', async () => {
    // Create test reminders
    await db.insert(remindersTable).values([
      {
        user_id: testUserId,
        title: 'Take medication',
        message: 'Time for your daily medication',
        reminder_time: '08:00',
        days_of_week: [1, 2, 3, 4, 5], // Weekdays
        reminder_type: 'medication',
        target_id: 1
      },
      {
        user_id: testUserId,
        title: 'Mood check-in',
        message: null,
        reminder_time: '20:00',
        days_of_week: [0, 1, 2, 3, 4, 5, 6], // Daily
        reminder_type: 'mood',
        target_id: null
      },
      {
        user_id: otherUserId, // Different user
        title: 'Other reminder',
        message: 'Other user reminder',
        reminder_time: '12:00',
        days_of_week: [0, 6], // Weekends
        reminder_type: 'general',
        target_id: null
      }
    ]).execute();

    const query: UserDataQuery = { user_id: testUserId };
    const result = await exportUserData(query);

    expect(result.reminders).toHaveLength(2);
    expect(result.reminders[0].title).toBe('Take medication');
    expect(result.reminders[0].message).toBe('Time for your daily medication');
    expect(result.reminders[0].reminder_type).toBe('medication');
    expect(result.reminders[0].target_id).toBe(1);
    expect(result.reminders[1].title).toBe('Mood check-in');
    expect(result.reminders[1].message).toBeNull();
    expect(result.reminders[1].reminder_type).toBe('mood');
    expect(result.reminders[1].target_id).toBeNull();
  });

  it('should export complete user profile with all data types', async () => {
    // Create comprehensive test data
    const medications = await db.insert(medicationsTable).values({
      user_id: testUserId,
      name: 'Test Med',
      dosage: '10mg',
      frequency: 'daily'
    }).returning().execute();

    const supplements = await db.insert(supplementsTable).values({
      user_id: testUserId,
      name: 'Test Supplement',
      dosage: '500mg',
      frequency: 'daily'
    }).returning().execute();

    const habits = await db.insert(habitsTable).values({
      user_id: testUserId,
      name: 'Test Habit',
      description: 'A test habit',
      target_frequency: 'daily'
    }).returning().execute();

    // Create entries in all tables
    await Promise.all([
      db.insert(moodEntriesTable).values({
        user_id: testUserId,
        mood_score: 8,
        notes: 'Great day'
      }).execute(),
      
      db.insert(medicationLogsTable).values({
        medication_id: medications[0].id,
        user_id: testUserId,
        notes: 'Taken as prescribed'
      }).execute(),
      
      db.insert(supplementLogsTable).values({
        supplement_id: supplements[0].id,
        user_id: testUserId,
        notes: 'With breakfast'
      }).execute(),
      
      db.insert(habitLogsTable).values({
        habit_id: habits[0].id,
        user_id: testUserId,
        notes: 'Completed successfully'
      }).execute(),
      
      db.insert(remindersTable).values({
        user_id: testUserId,
        title: 'Daily reminder',
        message: 'Don\'t forget!',
        reminder_time: '09:00',
        days_of_week: [1, 2, 3, 4, 5],
        reminder_type: 'general',
        target_id: null
      }).execute()
    ]);

    const query: UserDataQuery = { user_id: testUserId };
    const result = await exportUserData(query);

    // Verify all data types are present
    expect(result.mood_entries).toHaveLength(1);
    expect(result.medications).toHaveLength(1);
    expect(result.medication_logs).toHaveLength(1);
    expect(result.supplements).toHaveLength(1);
    expect(result.supplement_logs).toHaveLength(1);
    expect(result.habits).toHaveLength(1);
    expect(result.habit_logs).toHaveLength(1);
    expect(result.reminders).toHaveLength(1);

    // Verify export timestamp
    expect(result.exported_at).toBeInstanceOf(Date);
    
    // Verify export timestamp is recent (within last minute)
    const now = new Date();
    const timeDiff = now.getTime() - result.exported_at.getTime();
    expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
  });

  it('should only export data for the specified user', async () => {
    // Create data for multiple users
    await Promise.all([
      // User 1 data
      db.insert(moodEntriesTable).values({
        user_id: testUserId,
        mood_score: 8,
        notes: 'User 1 mood'
      }).execute(),
      
      db.insert(medicationsTable).values({
        user_id: testUserId,
        name: 'User 1 Med',
        dosage: '10mg',
        frequency: 'daily'
      }).execute(),
      
      // User 2 data
      db.insert(moodEntriesTable).values({
        user_id: otherUserId,
        mood_score: 6,
        notes: 'User 2 mood'
      }).execute(),
      
      db.insert(medicationsTable).values({
        user_id: otherUserId,
        name: 'User 2 Med',
        dosage: '5mg',
        frequency: 'daily'
      }).execute()
    ]);

    const query: UserDataQuery = { user_id: testUserId };
    const result = await exportUserData(query);

    // Verify only user 1 data is returned
    expect(result.mood_entries).toHaveLength(1);
    expect(result.mood_entries[0].user_id).toBe(testUserId);
    expect(result.mood_entries[0].notes).toBe('User 1 mood');

    expect(result.medications).toHaveLength(1);
    expect(result.medications[0].user_id).toBe(testUserId);
    expect(result.medications[0].name).toBe('User 1 Med');
  });
});