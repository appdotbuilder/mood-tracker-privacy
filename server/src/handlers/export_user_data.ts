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
import { type ExportData, type UserDataQuery } from '../schema';
import { eq } from 'drizzle-orm';

export const exportUserData = async (query: UserDataQuery): Promise<ExportData> => {
  try {
    const { user_id } = query;

    // Query all user data from all tables concurrently
    const [
      moodEntries,
      medications,
      medicationLogs,
      supplements,
      supplementLogs,
      habits,
      habitLogs,
      reminders
    ] = await Promise.all([
      // Mood entries
      db.select()
        .from(moodEntriesTable)
        .where(eq(moodEntriesTable.user_id, user_id))
        .execute(),

      // Medications
      db.select()
        .from(medicationsTable)
        .where(eq(medicationsTable.user_id, user_id))
        .execute(),

      // Medication logs
      db.select()
        .from(medicationLogsTable)
        .where(eq(medicationLogsTable.user_id, user_id))
        .execute(),

      // Supplements
      db.select()
        .from(supplementsTable)
        .where(eq(supplementsTable.user_id, user_id))
        .execute(),

      // Supplement logs
      db.select()
        .from(supplementLogsTable)
        .where(eq(supplementLogsTable.user_id, user_id))
        .execute(),

      // Habits
      db.select()
        .from(habitsTable)
        .where(eq(habitsTable.user_id, user_id))
        .execute(),

      // Habit logs
      db.select()
        .from(habitLogsTable)
        .where(eq(habitLogsTable.user_id, user_id))
        .execute(),

      // Reminders
      db.select()
        .from(remindersTable)
        .where(eq(remindersTable.user_id, user_id))
        .execute()
    ]);

    // Return structured export data with proper type casting for JSONB fields
    return {
      mood_entries: moodEntries,
      medications: medications,
      medication_logs: medicationLogs,
      supplements: supplements,
      supplement_logs: supplementLogs,
      habits: habits,
      habit_logs: habitLogs,
      reminders: reminders.map(reminder => ({
        ...reminder,
        days_of_week: reminder.days_of_week as number[],
        reminder_type: reminder.reminder_type as 'mood' | 'medication' | 'supplement' | 'habit' | 'general'
      })),
      exported_at: new Date()
    };
  } catch (error) {
    console.error('User data export failed:', error);
    throw error;
  }
};