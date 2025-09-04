import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { remindersTable } from '../db/schema';
import { type UpdateReminderInput, type CreateReminderInput } from '../schema';
import { updateReminder } from '../handlers/update_reminder';
import { eq } from 'drizzle-orm';

// Helper function to create a test reminder
const createTestReminder = async (input: CreateReminderInput) => {
  const result = await db.insert(remindersTable)
    .values({
      user_id: input.user_id,
      title: input.title,
      message: input.message || null,
      reminder_time: input.reminder_time,
      days_of_week: input.days_of_week,
      reminder_type: input.reminder_type,
      target_id: input.target_id || null,
      is_active: true
    })
    .returning()
    .execute();
    
  return result[0];
};

describe('updateReminder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update reminder title', async () => {
    // Create test reminder
    const testReminder = await createTestReminder({
      user_id: 'user123',
      title: 'Original Title',
      message: 'Take your medication',
      reminder_time: '09:00',
      days_of_week: [1, 2, 3, 4, 5],
      reminder_type: 'medication',
      target_id: 1
    });

    const updateInput: UpdateReminderInput = {
      id: testReminder.id,
      title: 'Updated Title'
    };

    const result = await updateReminder(updateInput);

    expect(result.id).toEqual(testReminder.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.message).toEqual('Take your medication'); // Unchanged
    expect(result.reminder_time).toEqual('09:00'); // Unchanged
    expect(result.days_of_week).toEqual([1, 2, 3, 4, 5]); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testReminder.updated_at).toBe(true);
  });

  it('should update reminder time and days', async () => {
    // Create test reminder
    const testReminder = await createTestReminder({
      user_id: 'user123',
      title: 'Medication Reminder',
      reminder_time: '09:00',
      days_of_week: [1, 2, 3, 4, 5],
      reminder_type: 'medication'
    });

    const updateInput: UpdateReminderInput = {
      id: testReminder.id,
      reminder_time: '18:30',
      days_of_week: [0, 6] // Weekend only
    };

    const result = await updateReminder(updateInput);

    expect(result.reminder_time).toEqual('18:30');
    expect(result.days_of_week).toEqual([0, 6]);
    expect(result.title).toEqual('Medication Reminder'); // Unchanged
  });

  it('should deactivate reminder', async () => {
    // Create test reminder
    const testReminder = await createTestReminder({
      user_id: 'user123',
      title: 'Active Reminder',
      reminder_time: '12:00',
      days_of_week: [1, 3, 5],
      reminder_type: 'general'
    });

    const updateInput: UpdateReminderInput = {
      id: testReminder.id,
      is_active: false
    };

    const result = await updateReminder(updateInput);

    expect(result.is_active).toBe(false);
    expect(result.title).toEqual('Active Reminder'); // Unchanged
  });

  it('should update reminder type and target_id', async () => {
    // Create test reminder
    const testReminder = await createTestReminder({
      user_id: 'user123',
      title: 'General Reminder',
      reminder_time: '10:00',
      days_of_week: [1, 2, 3, 4, 5],
      reminder_type: 'general',
      target_id: null
    });

    const updateInput: UpdateReminderInput = {
      id: testReminder.id,
      reminder_type: 'habit',
      target_id: 42
    };

    const result = await updateReminder(updateInput);

    expect(result.reminder_type).toEqual('habit');
    expect(result.target_id).toEqual(42);
  });

  it('should update message to null', async () => {
    // Create test reminder with message
    const testReminder = await createTestReminder({
      user_id: 'user123',
      title: 'Reminder with Message',
      message: 'Original message',
      reminder_time: '14:00',
      days_of_week: [1, 2, 3],
      reminder_type: 'mood'
    });

    const updateInput: UpdateReminderInput = {
      id: testReminder.id,
      message: null
    };

    const result = await updateReminder(updateInput);

    expect(result.message).toBeNull();
    expect(result.title).toEqual('Reminder with Message'); // Unchanged
  });

  it('should update all fields at once', async () => {
    // Create test reminder
    const testReminder = await createTestReminder({
      user_id: 'user123',
      title: 'Original',
      message: 'Original message',
      reminder_time: '08:00',
      days_of_week: [1, 2, 3, 4, 5],
      reminder_type: 'general',
      target_id: null
    });

    const updateInput: UpdateReminderInput = {
      id: testReminder.id,
      title: 'Completely Updated',
      message: 'New message',
      reminder_time: '20:15',
      days_of_week: [0, 1, 2, 3, 4, 5, 6], // Every day
      is_active: false,
      reminder_type: 'supplement',
      target_id: 99
    };

    const result = await updateReminder(updateInput);

    expect(result.title).toEqual('Completely Updated');
    expect(result.message).toEqual('New message');
    expect(result.reminder_time).toEqual('20:15');
    expect(result.days_of_week).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(result.is_active).toBe(false);
    expect(result.reminder_type).toEqual('supplement');
    expect(result.target_id).toEqual(99);
    expect(result.user_id).toEqual('user123'); // Unchanged
  });

  it('should persist changes to database', async () => {
    // Create test reminder
    const testReminder = await createTestReminder({
      user_id: 'user123',
      title: 'Database Test',
      reminder_time: '11:00',
      days_of_week: [2, 4],
      reminder_type: 'habit'
    });

    const updateInput: UpdateReminderInput = {
      id: testReminder.id,
      title: 'Updated in DB',
      is_active: false
    };

    await updateReminder(updateInput);

    // Verify changes persisted to database
    const remindersFromDb = await db.select()
      .from(remindersTable)
      .where(eq(remindersTable.id, testReminder.id))
      .execute();

    expect(remindersFromDb).toHaveLength(1);
    expect(remindersFromDb[0].title).toEqual('Updated in DB');
    expect(remindersFromDb[0].is_active).toBe(false);
    expect(remindersFromDb[0].reminder_time).toEqual('11:00'); // Unchanged
    expect(remindersFromDb[0].days_of_week).toEqual([2, 4]); // Unchanged
  });

  it('should throw error for non-existent reminder', async () => {
    const updateInput: UpdateReminderInput = {
      id: 99999, // Non-existent ID
      title: 'This should fail'
    };

    await expect(updateReminder(updateInput)).rejects.toThrow(/Reminder with id 99999 not found/i);
  });

  it('should handle empty update gracefully', async () => {
    // Create test reminder
    const testReminder = await createTestReminder({
      user_id: 'user123',
      title: 'No Changes',
      reminder_time: '16:00',
      days_of_week: [3],
      reminder_type: 'general'
    });

    const updateInput: UpdateReminderInput = {
      id: testReminder.id
      // No fields to update except implicit updated_at
    };

    const result = await updateReminder(updateInput);

    // All original fields should remain the same
    expect(result.title).toEqual('No Changes');
    expect(result.reminder_time).toEqual('16:00');
    expect(result.days_of_week).toEqual([3]);
    expect(result.reminder_type).toEqual('general');
    expect(result.is_active).toBe(true);
    
    // But updated_at should be newer
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testReminder.updated_at).toBe(true);
  });
});