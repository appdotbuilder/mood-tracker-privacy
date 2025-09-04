import { db } from '../db';
import { medicationLogsTable, medicationsTable } from '../db/schema';
import { type CreateMedicationLogInput, type MedicationLog } from '../schema';
import { eq } from 'drizzle-orm';

export const createMedicationLog = async (input: CreateMedicationLogInput): Promise<MedicationLog> => {
  try {
    // Verify the medication exists and belongs to the user
    const medication = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.id, input.medication_id))
      .execute();

    if (medication.length === 0) {
      throw new Error('Medication not found');
    }

    if (medication[0].user_id !== input.user_id) {
      throw new Error('Medication does not belong to the specified user');
    }

    // Insert medication log record
    const result = await db.insert(medicationLogsTable)
      .values({
        medication_id: input.medication_id,
        user_id: input.user_id,
        taken_at: input.taken_at || new Date(),
        notes: input.notes || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Medication log creation failed:', error);
    throw error;
  }
};