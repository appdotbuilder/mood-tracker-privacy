import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import all schemas
import {
  createMoodEntryInputSchema,
  updateMoodEntryInputSchema,
  createMedicationInputSchema,
  updateMedicationInputSchema,
  createMedicationLogInputSchema,
  createSupplementInputSchema,
  updateSupplementInputSchema,
  createSupplementLogInputSchema,
  createHabitInputSchema,
  updateHabitInputSchema,
  createHabitLogInputSchema,
  createReminderInputSchema,
  updateReminderInputSchema,
  userDataQuerySchema,
  dateRangeQuerySchema
} from './schema';

// Import all handlers
import { createMoodEntry } from './handlers/create_mood_entry';
import { getMoodEntries, getMoodEntriesByDateRange } from './handlers/get_mood_entries';
import { updateMoodEntry } from './handlers/update_mood_entry';
import { createMedication } from './handlers/create_medication';
import { getMedications, getActiveMedications } from './handlers/get_medications';
import { createMedicationLog } from './handlers/create_medication_log';
import { getMedicationLogs, getMedicationLogsByDateRange } from './handlers/get_medication_logs';
import { createSupplement } from './handlers/create_supplement';
import { getSupplements, getActiveSupplements } from './handlers/get_supplements';
import { createSupplementLog } from './handlers/create_supplement_log';
import { createHabit } from './handlers/create_habit';
import { getHabits, getActiveHabits } from './handlers/get_habits';
import { createHabitLog } from './handlers/create_habit_log';
import { getHabitLogs, getHabitLogsByDateRange } from './handlers/get_habit_logs';
import { createReminder } from './handlers/create_reminder';
import { getReminders, getActiveReminders } from './handlers/get_reminders';
import { updateReminder } from './handlers/update_reminder';
import { exportUserData } from './handlers/export_user_data';
import { getMoodAnalytics } from './handlers/get_mood_analytics';
import { getHabitAnalytics } from './handlers/get_habit_analytics';
import { getAdherenceAnalytics } from './handlers/get_adherence_analytics';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Mood tracking routes
  createMoodEntry: publicProcedure
    .input(createMoodEntryInputSchema)
    .mutation(({ input }) => createMoodEntry(input)),

  getMoodEntries: publicProcedure
    .input(userDataQuerySchema)
    .query(({ input }) => getMoodEntries(input)),

  getMoodEntriesByDateRange: publicProcedure
    .input(dateRangeQuerySchema)
    .query(({ input }) => getMoodEntriesByDateRange(input)),

  updateMoodEntry: publicProcedure
    .input(updateMoodEntryInputSchema)
    .mutation(({ input }) => updateMoodEntry(input)),

  getMoodAnalytics: publicProcedure
    .input(dateRangeQuerySchema)
    .query(({ input }) => getMoodAnalytics(input)),

  // Medication tracking routes
  createMedication: publicProcedure
    .input(createMedicationInputSchema)
    .mutation(({ input }) => createMedication(input)),

  getMedications: publicProcedure
    .input(userDataQuerySchema)
    .query(({ input }) => getMedications(input)),

  getActiveMedications: publicProcedure
    .input(userDataQuerySchema)
    .query(({ input }) => getActiveMedications(input)),

  createMedicationLog: publicProcedure
    .input(createMedicationLogInputSchema)
    .mutation(({ input }) => createMedicationLog(input)),

  getMedicationLogs: publicProcedure
    .input(userDataQuerySchema)
    .query(({ input }) => getMedicationLogs(input)),

  getMedicationLogsByDateRange: publicProcedure
    .input(dateRangeQuerySchema)
    .query(({ input }) => getMedicationLogsByDateRange(input)),

  // Supplement tracking routes
  createSupplement: publicProcedure
    .input(createSupplementInputSchema)
    .mutation(({ input }) => createSupplement(input)),

  getSupplements: publicProcedure
    .input(userDataQuerySchema)
    .query(({ input }) => getSupplements(input)),

  getActiveSupplements: publicProcedure
    .input(userDataQuerySchema)
    .query(({ input }) => getActiveSupplements(input)),

  createSupplementLog: publicProcedure
    .input(createSupplementLogInputSchema)
    .mutation(({ input }) => createSupplementLog(input)),

  // Habit tracking routes
  createHabit: publicProcedure
    .input(createHabitInputSchema)
    .mutation(({ input }) => createHabit(input)),

  getHabits: publicProcedure
    .input(userDataQuerySchema)
    .query(({ input }) => getHabits(input)),

  getActiveHabits: publicProcedure
    .input(userDataQuerySchema)
    .query(({ input }) => getActiveHabits(input)),

  createHabitLog: publicProcedure
    .input(createHabitLogInputSchema)
    .mutation(({ input }) => createHabitLog(input)),

  getHabitLogs: publicProcedure
    .input(userDataQuerySchema)
    .query(({ input }) => getHabitLogs(input)),

  getHabitLogsByDateRange: publicProcedure
    .input(dateRangeQuerySchema)
    .query(({ input }) => getHabitLogsByDateRange(input)),

  getHabitAnalytics: publicProcedure
    .input(dateRangeQuerySchema)
    .query(({ input }) => getHabitAnalytics(input)),

  // Reminder routes
  createReminder: publicProcedure
    .input(createReminderInputSchema)
    .mutation(({ input }) => createReminder(input)),

  getReminders: publicProcedure
    .input(userDataQuerySchema)
    .query(({ input }) => getReminders(input)),

  getActiveReminders: publicProcedure
    .input(userDataQuerySchema)
    .query(({ input }) => getActiveReminders(input)),

  updateReminder: publicProcedure
    .input(updateReminderInputSchema)
    .mutation(({ input }) => updateReminder(input)),

  // Analytics and insights routes
  getAdherenceAnalytics: publicProcedure
    .input(dateRangeQuerySchema)
    .query(({ input }) => getAdherenceAnalytics(input)),

  // Data export route for data ownership
  exportUserData: publicProcedure
    .input(userDataQuerySchema)
    .query(({ input }) => exportUserData(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC Mood Tracker server listening at port: ${port}`);
}

start();