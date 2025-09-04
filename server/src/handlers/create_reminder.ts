import { db } from '../db';
import { remindersTable } from '../db/schema';
import { type CreateReminderInput, type Reminder } from '../schema';

export const createReminder = async (input: CreateReminderInput): Promise<Reminder> => {
  try {
    // Insert reminder record
    const result = await db.insert(remindersTable)
      .values({
        user_id: input.user_id,
        title: input.title,
        message: input.message || null,
        reminder_time: input.reminder_time,
        days_of_week: input.days_of_week, // jsonb column - array handled directly
        reminder_type: input.reminder_type,
        target_id: input.target_id || null
      })
      .returning()
      .execute();

    const reminder = result[0];
    return {
      ...reminder,
      days_of_week: reminder.days_of_week as number[],
      reminder_type: reminder.reminder_type as 'mood' | 'medication' | 'supplement' | 'habit' | 'general'
    };
  } catch (error) {
    console.error('Reminder creation failed:', error);
    throw error;
  }
};