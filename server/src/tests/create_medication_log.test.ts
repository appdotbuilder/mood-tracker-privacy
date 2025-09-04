import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicationLogsTable, medicationsTable } from '../db/schema';
import { type CreateMedicationLogInput } from '../schema';
import { createMedicationLog } from '../handlers/create_medication_log';
import { eq } from 'drizzle-orm';

describe('createMedicationLog', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test medication
  const createTestMedication = async (userId: string = 'user123') => {
    const result = await db.insert(medicationsTable)
      .values({
        user_id: userId,
        name: 'Test Medication',
        frequency: 'daily',
        dosage: '10mg'
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should create a medication log', async () => {
    const medication = await createTestMedication();
    
    const testInput: CreateMedicationLogInput = {
      medication_id: medication.id,
      user_id: 'user123',
      notes: 'Took with breakfast'
    };

    const result = await createMedicationLog(testInput);

    // Basic field validation
    expect(result.medication_id).toEqual(medication.id);
    expect(result.user_id).toEqual('user123');
    expect(result.notes).toEqual('Took with breakfast');
    expect(result.id).toBeDefined();
    expect(result.taken_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a medication log with custom taken_at time', async () => {
    const medication = await createTestMedication();
    const customTime = new Date('2024-01-15T08:30:00Z');
    
    const testInput: CreateMedicationLogInput = {
      medication_id: medication.id,
      user_id: 'user123',
      taken_at: customTime,
      notes: 'Morning dose'
    };

    const result = await createMedicationLog(testInput);

    expect(result.medication_id).toEqual(medication.id);
    expect(result.user_id).toEqual('user123');
    expect(result.taken_at).toEqual(customTime);
    expect(result.notes).toEqual('Morning dose');
  });

  it('should create a medication log with null notes', async () => {
    const medication = await createTestMedication();
    
    const testInput: CreateMedicationLogInput = {
      medication_id: medication.id,
      user_id: 'user123',
      notes: null
    };

    const result = await createMedicationLog(testInput);

    expect(result.medication_id).toEqual(medication.id);
    expect(result.user_id).toEqual('user123');
    expect(result.notes).toBeNull();
    expect(result.taken_at).toBeInstanceOf(Date);
  });

  it('should create a medication log without notes field', async () => {
    const medication = await createTestMedication();
    
    const testInput: CreateMedicationLogInput = {
      medication_id: medication.id,
      user_id: 'user123'
    };

    const result = await createMedicationLog(testInput);

    expect(result.medication_id).toEqual(medication.id);
    expect(result.user_id).toEqual('user123');
    expect(result.notes).toBeNull();
    expect(result.taken_at).toBeInstanceOf(Date);
  });

  it('should save medication log to database', async () => {
    const medication = await createTestMedication();
    
    const testInput: CreateMedicationLogInput = {
      medication_id: medication.id,
      user_id: 'user123',
      notes: 'Evening dose'
    };

    const result = await createMedicationLog(testInput);

    // Query the database to verify the log was saved
    const logs = await db.select()
      .from(medicationLogsTable)
      .where(eq(medicationLogsTable.id, result.id))
      .execute();

    expect(logs).toHaveLength(1);
    expect(logs[0].medication_id).toEqual(medication.id);
    expect(logs[0].user_id).toEqual('user123');
    expect(logs[0].notes).toEqual('Evening dose');
    expect(logs[0].taken_at).toBeInstanceOf(Date);
    expect(logs[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when medication does not exist', async () => {
    const testInput: CreateMedicationLogInput = {
      medication_id: 999, // Non-existent medication ID
      user_id: 'user123',
      notes: 'Test note'
    };

    await expect(createMedicationLog(testInput)).rejects.toThrow(/medication not found/i);
  });

  it('should throw error when medication belongs to different user', async () => {
    const medication = await createTestMedication('user456'); // Different user
    
    const testInput: CreateMedicationLogInput = {
      medication_id: medication.id,
      user_id: 'user123', // Different user trying to log
      notes: 'Unauthorized attempt'
    };

    await expect(createMedicationLog(testInput)).rejects.toThrow(/medication does not belong to the specified user/i);
  });

  it('should create multiple logs for the same medication', async () => {
    const medication = await createTestMedication();
    
    const firstLog: CreateMedicationLogInput = {
      medication_id: medication.id,
      user_id: 'user123',
      taken_at: new Date('2024-01-15T08:00:00Z'),
      notes: 'Morning dose'
    };

    const secondLog: CreateMedicationLogInput = {
      medication_id: medication.id,
      user_id: 'user123',
      taken_at: new Date('2024-01-15T20:00:00Z'),
      notes: 'Evening dose'
    };

    const result1 = await createMedicationLog(firstLog);
    const result2 = await createMedicationLog(secondLog);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.notes).toEqual('Morning dose');
    expect(result2.notes).toEqual('Evening dose');

    // Verify both logs exist in database
    const logs = await db.select()
      .from(medicationLogsTable)
      .where(eq(medicationLogsTable.medication_id, medication.id))
      .execute();

    expect(logs).toHaveLength(2);
  });

  it('should handle medication log for inactive medication', async () => {
    // Create an inactive medication
    const inactiveMedication = await db.insert(medicationsTable)
      .values({
        user_id: 'user123',
        name: 'Inactive Medication',
        frequency: 'daily',
        is_active: false
      })
      .returning()
      .execute();

    const testInput: CreateMedicationLogInput = {
      medication_id: inactiveMedication[0].id,
      user_id: 'user123',
      notes: 'Log for inactive medication'
    };

    // Should still allow logging for inactive medications
    // (user might want to log past doses)
    const result = await createMedicationLog(testInput);

    expect(result.medication_id).toEqual(inactiveMedication[0].id);
    expect(result.user_id).toEqual('user123');
    expect(result.notes).toEqual('Log for inactive medication');
  });
});