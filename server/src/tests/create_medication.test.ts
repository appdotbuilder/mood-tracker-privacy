import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicationsTable } from '../db/schema';
import { type CreateMedicationInput } from '../schema';
import { createMedication } from '../handlers/create_medication';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateMedicationInput = {
  user_id: 'user123',
  name: 'Aspirin',
  dosage: '100mg',
  frequency: 'daily'
};

// Test input without optional dosage field
const testInputNoDosage: CreateMedicationInput = {
  user_id: 'user456',
  name: 'Ibuprofen',
  frequency: 'twice daily'
};

describe('createMedication', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a medication with all fields', async () => {
    const result = await createMedication(testInput);

    // Basic field validation
    expect(result.name).toEqual('Aspirin');
    expect(result.user_id).toEqual('user123');
    expect(result.dosage).toEqual('100mg');
    expect(result.frequency).toEqual('daily');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a medication without dosage', async () => {
    const result = await createMedication(testInputNoDosage);

    // Verify fields including null dosage
    expect(result.name).toEqual('Ibuprofen');
    expect(result.user_id).toEqual('user456');
    expect(result.dosage).toBeNull();
    expect(result.frequency).toEqual('twice daily');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save medication to database', async () => {
    const result = await createMedication(testInput);

    // Query using proper drizzle syntax
    const medications = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.id, result.id))
      .execute();

    expect(medications).toHaveLength(1);
    expect(medications[0].name).toEqual('Aspirin');
    expect(medications[0].user_id).toEqual('user123');
    expect(medications[0].dosage).toEqual('100mg');
    expect(medications[0].frequency).toEqual('daily');
    expect(medications[0].is_active).toBe(true);
    expect(medications[0].created_at).toBeInstanceOf(Date);
    expect(medications[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple medications for the same user', async () => {
    const medication1Input: CreateMedicationInput = {
      user_id: 'user789',
      name: 'Medication A',
      dosage: '10mg',
      frequency: 'daily'
    };

    const medication2Input: CreateMedicationInput = {
      user_id: 'user789',
      name: 'Medication B',
      frequency: 'as needed'
    };

    const result1 = await createMedication(medication1Input);
    const result2 = await createMedication(medication2Input);

    // Verify both medications are created with different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.user_id).toEqual(result2.user_id);
    expect(result1.name).toEqual('Medication A');
    expect(result2.name).toEqual('Medication B');
    expect(result1.dosage).toEqual('10mg');
    expect(result2.dosage).toBeNull();

    // Query all medications for the user
    const userMedications = await db.select()
      .from(medicationsTable)
      .where(eq(medicationsTable.user_id, 'user789'))
      .execute();

    expect(userMedications).toHaveLength(2);
  });

  it('should handle various frequency patterns', async () => {
    const frequencies = [
      'daily',
      'twice daily',
      'three times daily',
      'weekly',
      'as needed',
      'every 6 hours',
      'bedtime only'
    ];

    const results = [];
    for (let i = 0; i < frequencies.length; i++) {
      const input: CreateMedicationInput = {
        user_id: `user${i}`,
        name: `Medicine ${i}`,
        frequency: frequencies[i]
      };
      results.push(await createMedication(input));
    }

    // Verify all medications created with correct frequencies
    for (let i = 0; i < results.length; i++) {
      expect(results[i].frequency).toEqual(frequencies[i]);
      expect(results[i].is_active).toBe(true);
    }
  });

  it('should handle various dosage formats', async () => {
    const dosageInputs = [
      { dosage: '10mg', expected: '10mg' },
      { dosage: '1 tablet', expected: '1 tablet' },
      { dosage: '2.5ml', expected: '2.5ml' },
      { dosage: '1/2 pill', expected: '1/2 pill' },
      { dosage: undefined, expected: null }
    ];

    const results = [];
    for (let i = 0; i < dosageInputs.length; i++) {
      const input: CreateMedicationInput = {
        user_id: `dosage_user${i}`,
        name: `Dosage Medicine ${i}`,
        dosage: dosageInputs[i].dosage,
        frequency: 'daily'
      };
      results.push(await createMedication(input));
    }

    // Verify dosages are stored correctly
    for (let i = 0; i < results.length; i++) {
      expect(results[i].dosage).toEqual(dosageInputs[i].expected);
    }
  });
});