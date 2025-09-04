import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { supplementsTable } from '../db/schema';
import { type CreateSupplementInput } from '../schema';
import { createSupplement } from '../handlers/create_supplement';
import { eq } from 'drizzle-orm';

// Simple test input with all required fields
const testInput: CreateSupplementInput = {
  user_id: 'test-user-123',
  name: 'Vitamin D3',
  dosage: '2000 IU',
  frequency: 'daily'
};

describe('createSupplement', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a supplement with all fields', async () => {
    const result = await createSupplement(testInput);

    // Basic field validation
    expect(result.user_id).toEqual('test-user-123');
    expect(result.name).toEqual('Vitamin D3');
    expect(result.dosage).toEqual('2000 IU');
    expect(result.frequency).toEqual('daily');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a supplement without dosage', async () => {
    const inputWithoutDosage: CreateSupplementInput = {
      user_id: 'test-user-456',
      name: 'Multivitamin',
      frequency: 'twice daily'
    };

    const result = await createSupplement(inputWithoutDosage);

    expect(result.user_id).toEqual('test-user-456');
    expect(result.name).toEqual('Multivitamin');
    expect(result.dosage).toBeNull();
    expect(result.frequency).toEqual('twice daily');
    expect(result.is_active).toBe(true);
  });

  it('should save supplement to database', async () => {
    const result = await createSupplement(testInput);

    // Query using proper drizzle syntax
    const supplements = await db.select()
      .from(supplementsTable)
      .where(eq(supplementsTable.id, result.id))
      .execute();

    expect(supplements).toHaveLength(1);
    expect(supplements[0].user_id).toEqual('test-user-123');
    expect(supplements[0].name).toEqual('Vitamin D3');
    expect(supplements[0].dosage).toEqual('2000 IU');
    expect(supplements[0].frequency).toEqual('daily');
    expect(supplements[0].is_active).toBe(true);
    expect(supplements[0].created_at).toBeInstanceOf(Date);
    expect(supplements[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create supplements for different users', async () => {
    const user1Input: CreateSupplementInput = {
      user_id: 'user-1',
      name: 'Fish Oil',
      dosage: '1000mg',
      frequency: 'daily'
    };

    const user2Input: CreateSupplementInput = {
      user_id: 'user-2',
      name: 'Fish Oil',
      dosage: '500mg',
      frequency: 'twice daily'
    };

    const result1 = await createSupplement(user1Input);
    const result2 = await createSupplement(user2Input);

    expect(result1.user_id).toEqual('user-1');
    expect(result2.user_id).toEqual('user-2');
    expect(result1.dosage).toEqual('1000mg');
    expect(result2.dosage).toEqual('500mg');

    // Verify both records exist in database
    const allSupplements = await db.select()
      .from(supplementsTable)
      .execute();

    expect(allSupplements).toHaveLength(2);
  });

  it('should handle various supplement types and frequencies', async () => {
    const testCases: CreateSupplementInput[] = [
      {
        user_id: 'test-user',
        name: 'Magnesium',
        dosage: '400mg',
        frequency: 'at bedtime'
      },
      {
        user_id: 'test-user',
        name: 'Probiotic',
        frequency: 'as needed'
      },
      {
        user_id: 'test-user',
        name: 'Omega-3',
        dosage: '2 capsules',
        frequency: 'with meals'
      }
    ];

    for (const input of testCases) {
      const result = await createSupplement(input);
      expect(result.name).toEqual(input.name);
      expect(result.frequency).toEqual(input.frequency);
      expect(result.dosage).toEqual(input.dosage || null);
    }
  });
});