import { db } from '../db';
import { remindersTable } from '../db/schema';
import { type UpdateReminderInput, type Reminder } from '../schema';
import { eq } from 'drizzle-orm';

export const updateReminder = async (input: UpdateReminderInput): Promise<Reminder> => {
  try {
    // First, check if the reminder exists
    const existingReminder = await db.select()
      .from(remindersTable)
      .where(eq(remindersTable.id, input.id))
      .execute();

    if (existingReminder.length === 0) {
      throw new Error(`Reminder with id ${input.id} not found`);
    }

    // Build update values object with only provided fields
    const updateValues: {
      title?: string;
      message?: string | null;
      reminder_time?: string;
      days_of_week?: number[];
      is_active?: boolean;
      reminder_type?: 'mood' | 'medication' | 'supplement' | 'habit' | 'general';
      target_id?: number | null;
      updated_at: Date;
    } = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateValues.title = input.title;
    }
    if (input.message !== undefined) {
      updateValues.message = input.message;
    }
    if (input.reminder_time !== undefined) {
      updateValues.reminder_time = input.reminder_time;
    }
    if (input.days_of_week !== undefined) {
      updateValues.days_of_week = input.days_of_week;
    }
    if (input.is_active !== undefined) {
      updateValues.is_active = input.is_active;
    }
    if (input.reminder_type !== undefined) {
      updateValues.reminder_type = input.reminder_type;
    }
    if (input.target_id !== undefined) {
      updateValues.target_id = input.target_id;
    }

    // Update the reminder
    const result = await db.update(remindersTable)
      .set(updateValues)
      .where(eq(remindersTable.id, input.id))
      .returning()
      .execute();

    // Convert days_of_week from JSONB to array and ensure proper typing
    const updatedReminder = result[0];
    return {
      id: updatedReminder.id,
      user_id: updatedReminder.user_id,
      title: updatedReminder.title,
      message: updatedReminder.message,
      reminder_time: updatedReminder.reminder_time,
      days_of_week: Array.isArray(updatedReminder.days_of_week) 
        ? updatedReminder.days_of_week as number[]
        : updatedReminder.days_of_week as number[],
      is_active: updatedReminder.is_active,
      reminder_type: updatedReminder.reminder_type as 'mood' | 'medication' | 'supplement' | 'habit' | 'general',
      target_id: updatedReminder.target_id,
      created_at: updatedReminder.created_at,
      updated_at: updatedReminder.updated_at
    };
  } catch (error) {
    console.error('Reminder update failed:', error);
    throw error;
  }
};