import { z } from 'zod';

// Mood scale enum (1-10 scale)
export const moodScaleSchema = z.number().int().min(1).max(10);

// Mood entry schema
export const moodEntrySchema = z.object({
  id: z.number(),
  user_id: z.string(),
  mood_score: moodScaleSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type MoodEntry = z.infer<typeof moodEntrySchema>;

// Input schema for creating mood entries
export const createMoodEntryInputSchema = z.object({
  user_id: z.string(),
  mood_score: moodScaleSchema,
  notes: z.string().nullable().optional()
});

export type CreateMoodEntryInput = z.infer<typeof createMoodEntryInputSchema>;

// Input schema for updating mood entries
export const updateMoodEntryInputSchema = z.object({
  id: z.number(),
  mood_score: moodScaleSchema.optional(),
  notes: z.string().nullable().optional()
});

export type UpdateMoodEntryInput = z.infer<typeof updateMoodEntryInputSchema>;

// Medication schema
export const medicationSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  name: z.string(),
  dosage: z.string().nullable(),
  frequency: z.string(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Medication = z.infer<typeof medicationSchema>;

// Input schema for creating medications
export const createMedicationInputSchema = z.object({
  user_id: z.string(),
  name: z.string(),
  dosage: z.string().nullable().optional(),
  frequency: z.string()
});

export type CreateMedicationInput = z.infer<typeof createMedicationInputSchema>;

// Input schema for updating medications
export const updateMedicationInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  dosage: z.string().nullable().optional(),
  frequency: z.string().optional(),
  is_active: z.boolean().optional()
});

export type UpdateMedicationInput = z.infer<typeof updateMedicationInputSchema>;

// Medication log schema
export const medicationLogSchema = z.object({
  id: z.number(),
  medication_id: z.number(),
  user_id: z.string(),
  taken_at: z.coerce.date(),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type MedicationLog = z.infer<typeof medicationLogSchema>;

// Input schema for creating medication logs
export const createMedicationLogInputSchema = z.object({
  medication_id: z.number(),
  user_id: z.string(),
  taken_at: z.coerce.date().optional(),
  notes: z.string().nullable().optional()
});

export type CreateMedicationLogInput = z.infer<typeof createMedicationLogInputSchema>;

// Supplement schema
export const supplementSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  name: z.string(),
  dosage: z.string().nullable(),
  frequency: z.string(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Supplement = z.infer<typeof supplementSchema>;

// Input schema for creating supplements
export const createSupplementInputSchema = z.object({
  user_id: z.string(),
  name: z.string(),
  dosage: z.string().nullable().optional(),
  frequency: z.string()
});

export type CreateSupplementInput = z.infer<typeof createSupplementInputSchema>;

// Input schema for updating supplements
export const updateSupplementInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  dosage: z.string().nullable().optional(),
  frequency: z.string().optional(),
  is_active: z.boolean().optional()
});

export type UpdateSupplementInput = z.infer<typeof updateSupplementInputSchema>;

// Supplement log schema
export const supplementLogSchema = z.object({
  id: z.number(),
  supplement_id: z.number(),
  user_id: z.string(),
  taken_at: z.coerce.date(),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type SupplementLog = z.infer<typeof supplementLogSchema>;

// Input schema for creating supplement logs
export const createSupplementLogInputSchema = z.object({
  supplement_id: z.number(),
  user_id: z.string(),
  taken_at: z.coerce.date().optional(),
  notes: z.string().nullable().optional()
});

export type CreateSupplementLogInput = z.infer<typeof createSupplementLogInputSchema>;

// Habit schema
export const habitSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  target_frequency: z.string(), // daily, weekly, etc.
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Habit = z.infer<typeof habitSchema>;

// Input schema for creating habits
export const createHabitInputSchema = z.object({
  user_id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  target_frequency: z.string()
});

export type CreateHabitInput = z.infer<typeof createHabitInputSchema>;

// Input schema for updating habits
export const updateHabitInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  target_frequency: z.string().optional(),
  is_active: z.boolean().optional()
});

export type UpdateHabitInput = z.infer<typeof updateHabitInputSchema>;

// Habit log schema
export const habitLogSchema = z.object({
  id: z.number(),
  habit_id: z.number(),
  user_id: z.string(),
  completed_at: z.coerce.date(),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type HabitLog = z.infer<typeof habitLogSchema>;

// Input schema for creating habit logs
export const createHabitLogInputSchema = z.object({
  habit_id: z.number(),
  user_id: z.string(),
  completed_at: z.coerce.date().optional(),
  notes: z.string().nullable().optional()
});

export type CreateHabitLogInput = z.infer<typeof createHabitLogInputSchema>;

// Reminder schema
export const reminderSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  title: z.string(),
  message: z.string().nullable(),
  reminder_time: z.string(), // Time in HH:MM format
  days_of_week: z.array(z.number().int().min(0).max(6)), // 0 = Sunday, 6 = Saturday
  is_active: z.boolean(),
  reminder_type: z.enum(['mood', 'medication', 'supplement', 'habit', 'general']),
  target_id: z.number().nullable(), // ID of the related entity (medication, supplement, habit)
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Reminder = z.infer<typeof reminderSchema>;

// Input schema for creating reminders
export const createReminderInputSchema = z.object({
  user_id: z.string(),
  title: z.string(),
  message: z.string().nullable().optional(),
  reminder_time: z.string(),
  days_of_week: z.array(z.number().int().min(0).max(6)),
  reminder_type: z.enum(['mood', 'medication', 'supplement', 'habit', 'general']),
  target_id: z.number().nullable().optional()
});

export type CreateReminderInput = z.infer<typeof createReminderInputSchema>;

// Input schema for updating reminders
export const updateReminderInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  message: z.string().nullable().optional(),
  reminder_time: z.string().optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
  is_active: z.boolean().optional(),
  reminder_type: z.enum(['mood', 'medication', 'supplement', 'habit', 'general']).optional(),
  target_id: z.number().nullable().optional()
});

export type UpdateReminderInput = z.infer<typeof updateReminderInputSchema>;

// Query schemas for filtering and analytics
export const dateRangeQuerySchema = z.object({
  user_id: z.string(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;

export const userDataQuerySchema = z.object({
  user_id: z.string()
});

export type UserDataQuery = z.infer<typeof userDataQuerySchema>;

// Export data schema for data ownership
export const exportDataSchema = z.object({
  mood_entries: z.array(moodEntrySchema),
  medications: z.array(medicationSchema),
  medication_logs: z.array(medicationLogSchema),
  supplements: z.array(supplementSchema),
  supplement_logs: z.array(supplementLogSchema),
  habits: z.array(habitSchema),
  habit_logs: z.array(habitLogSchema),
  reminders: z.array(reminderSchema),
  exported_at: z.coerce.date()
});

export type ExportData = z.infer<typeof exportDataSchema>;