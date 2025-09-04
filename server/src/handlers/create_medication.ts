import { type CreateMedicationInput, type Medication } from '../schema';

export const createMedication = async (input: CreateMedicationInput): Promise<Medication> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new medication entry for tracking.
    // Users can add medications they want to track with dosage and frequency info.
    return Promise.resolve({
        id: 1,
        user_id: input.user_id,
        name: input.name,
        dosage: input.dosage || null,
        frequency: input.frequency,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
    } as Medication);
};