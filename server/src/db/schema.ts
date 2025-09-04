import { serial, text, pgTable, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Mood entries table
export const moodEntriesTable = pgTable('mood_entries', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull(),
  mood_score: integer('mood_score').notNull(), // 1-10 scale
  notes: text('notes'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Medications table
export const medicationsTable = pgTable('medications', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull(),
  name: text('name').notNull(),
  dosage: text('dosage'), // Nullable (e.g., "10mg", "1 tablet")
  frequency: text('frequency').notNull(), // e.g., "daily", "twice daily", "as needed"
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Medication logs table (when medications are taken)
export const medicationLogsTable = pgTable('medication_logs', {
  id: serial('id').primaryKey(),
  medication_id: integer('medication_id').notNull(),
  user_id: text('user_id').notNull(),
  taken_at: timestamp('taken_at').defaultNow().notNull(),
  notes: text('notes'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Supplements table
export const supplementsTable = pgTable('supplements', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull(),
  name: text('name').notNull(),
  dosage: text('dosage'), // Nullable (e.g., "1000mg", "2 capsules")
  frequency: text('frequency').notNull(), // e.g., "daily", "twice daily"
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Supplement logs table (when supplements are taken)
export const supplementLogsTable = pgTable('supplement_logs', {
  id: serial('id').primaryKey(),
  supplement_id: integer('supplement_id').notNull(),
  user_id: text('user_id').notNull(),
  taken_at: timestamp('taken_at').defaultNow().notNull(),
  notes: text('notes'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Habits table
export const habitsTable = pgTable('habits', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'), // Nullable
  target_frequency: text('target_frequency').notNull(), // e.g., "daily", "weekly", "3x per week"
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Habit logs table (when habits are completed)
export const habitLogsTable = pgTable('habit_logs', {
  id: serial('id').primaryKey(),
  habit_id: integer('habit_id').notNull(),
  user_id: text('user_id').notNull(),
  completed_at: timestamp('completed_at').defaultNow().notNull(),
  notes: text('notes'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Reminders table for configurable notifications
export const remindersTable = pgTable('reminders', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull(),
  title: text('title').notNull(),
  message: text('message'), // Nullable
  reminder_time: text('reminder_time').notNull(), // Time in HH:MM format
  days_of_week: jsonb('days_of_week').notNull(), // Array of integers [0-6] where 0 = Sunday
  is_active: boolean('is_active').default(true).notNull(),
  reminder_type: text('reminder_type').notNull(), // 'mood', 'medication', 'supplement', 'habit', 'general'
  target_id: integer('target_id'), // Nullable - ID of related entity
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations for better query building
export const medicationsRelations = relations(medicationsTable, ({ many }) => ({
  logs: many(medicationLogsTable),
}));

export const medicationLogsRelations = relations(medicationLogsTable, ({ one }) => ({
  medication: one(medicationsTable, {
    fields: [medicationLogsTable.medication_id],
    references: [medicationsTable.id],
  }),
}));

export const supplementsRelations = relations(supplementsTable, ({ many }) => ({
  logs: many(supplementLogsTable),
}));

export const supplementLogsRelations = relations(supplementLogsTable, ({ one }) => ({
  supplement: one(supplementsTable, {
    fields: [supplementLogsTable.supplement_id],
    references: [supplementsTable.id],
  }),
}));

export const habitsRelations = relations(habitsTable, ({ many }) => ({
  logs: many(habitLogsTable),
}));

export const habitLogsRelations = relations(habitLogsTable, ({ one }) => ({
  habit: one(habitsTable, {
    fields: [habitLogsTable.habit_id],
    references: [habitsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type MoodEntry = typeof moodEntriesTable.$inferSelect;
export type NewMoodEntry = typeof moodEntriesTable.$inferInsert;

export type Medication = typeof medicationsTable.$inferSelect;
export type NewMedication = typeof medicationsTable.$inferInsert;

export type MedicationLog = typeof medicationLogsTable.$inferSelect;
export type NewMedicationLog = typeof medicationLogsTable.$inferInsert;

export type Supplement = typeof supplementsTable.$inferSelect;
export type NewSupplement = typeof supplementsTable.$inferInsert;

export type SupplementLog = typeof supplementLogsTable.$inferSelect;
export type NewSupplementLog = typeof supplementLogsTable.$inferInsert;

export type Habit = typeof habitsTable.$inferSelect;
export type NewHabit = typeof habitsTable.$inferInsert;

export type HabitLog = typeof habitLogsTable.$inferSelect;
export type NewHabitLog = typeof habitLogsTable.$inferInsert;

export type Reminder = typeof remindersTable.$inferSelect;
export type NewReminder = typeof remindersTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  moodEntries: moodEntriesTable,
  medications: medicationsTable,
  medicationLogs: medicationLogsTable,
  supplements: supplementsTable,
  supplementLogs: supplementLogsTable,
  habits: habitsTable,
  habitLogs: habitLogsTable,
  reminders: remindersTable,
};