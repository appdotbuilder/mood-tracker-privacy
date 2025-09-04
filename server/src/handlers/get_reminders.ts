import { db } from '../db';
import { remindersTable } from '../db/schema';
import { type Reminder, type UserDataQuery } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getReminders = async (query: UserDataQuery): Promise<Reminder[]> => {
  try {
    const results = await db.select()
      .from(remindersTable)
      .where(eq(remindersTable.user_id, query.user_id))
      .execute();

    // Convert JSONB days_of_week back to array and ensure dates are Date objects
    return results.map(reminder => ({
      ...reminder,
      days_of_week: Array.isArray(reminder.days_of_week) ? reminder.days_of_week as number[] : [],
      reminder_type: reminder.reminder_type as 'mood' | 'medication' | 'supplement' | 'habit' | 'general',
      created_at: new Date(reminder.created_at),
      updated_at: new Date(reminder.updated_at)
    }));
  } catch (error) {
    console.error('Failed to fetch reminders:', error);
    throw error;
  }
};

export const getActiveReminders = async (query: UserDataQuery): Promise<Reminder[]> => {
  try {
    const results = await db.select()
      .from(remindersTable)
      .where(
        and(
          eq(remindersTable.user_id, query.user_id),
          eq(remindersTable.is_active, true)
        )
      )
      .execute();

    // Convert JSONB days_of_week back to array and ensure dates are Date objects
    return results.map(reminder => ({
      ...reminder,
      days_of_week: Array.isArray(reminder.days_of_week) ? reminder.days_of_week as number[] : [],
      reminder_type: reminder.reminder_type as 'mood' | 'medication' | 'supplement' | 'habit' | 'general',
      created_at: new Date(reminder.created_at),
      updated_at: new Date(reminder.updated_at)
    }));
  } catch (error) {
    console.error('Failed to fetch active reminders:', error);
    throw error;
  }
};