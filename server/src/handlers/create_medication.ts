import { db } from '../db';
import { medicationsTable } from '../db/schema';
import { type CreateMedicationInput, type Medication } from '../schema';

export const createMedication = async (input: CreateMedicationInput): Promise<Medication> => {
  try {
    // Insert medication record
    const result = await db.insert(medicationsTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        dosage: input.dosage || null,
        frequency: input.frequency,
        is_active: true // Default to active
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Medication creation failed:', error);
    throw error;
  }
};