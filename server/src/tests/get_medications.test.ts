import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicationsTable } from '../db/schema';
import { type UserDataQuery } from '../schema';
import { getMedications, getActiveMedications } from '../handlers/get_medications';

// Test input
const testQuery: UserDataQuery = {
  user_id: 'user123'
};

const testMedication1 = {
  user_id: 'user123',
  name: 'Aspirin',
  dosage: '100mg',
  frequency: 'daily',
  is_active: true
};

const testMedication2 = {
  user_id: 'user123',
  name: 'Vitamin D',
  dosage: '1000IU',
  frequency: 'daily',
  is_active: false
};

const testMedication3 = {
  user_id: 'user456',
  name: 'Ibuprofen',
  dosage: '200mg',
  frequency: 'as needed',
  is_active: true
};

describe('getMedications', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no medications exist', async () => {
    const result = await getMedications(testQuery);
    expect(result).toEqual([]);
  });

  it('should return all medications for a user', async () => {
    // Create test medications
    await db.insert(medicationsTable)
      .values([testMedication1, testMedication2])
      .execute();

    const result = await getMedications(testQuery);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Aspirin');
    expect(result[0].dosage).toEqual('100mg');
    expect(result[0].frequency).toEqual('daily');
    expect(result[0].is_active).toEqual(true);
    expect(result[0].user_id).toEqual('user123');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].name).toEqual('Vitamin D');
    expect(result[1].is_active).toEqual(false);
  });

  it('should only return medications for the specified user', async () => {
    // Create medications for different users
    await db.insert(medicationsTable)
      .values([testMedication1, testMedication3])
      .execute();

    const result = await getMedications(testQuery);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Aspirin');
    expect(result[0].user_id).toEqual('user123');
  });

  it('should return medications ordered by created_at descending', async () => {
    // Insert medications in sequence with slight delay to ensure different timestamps
    await db.insert(medicationsTable)
      .values(testMedication1)
      .execute();

    // Wait a moment to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(medicationsTable)
      .values(testMedication2)
      .execute();

    const result = await getMedications(testQuery);

    expect(result).toHaveLength(2);
    // Most recent should be first (Vitamin D was inserted last)
    expect(result[0].name).toEqual('Vitamin D');
    expect(result[1].name).toEqual('Aspirin');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should include both active and inactive medications', async () => {
    await db.insert(medicationsTable)
      .values([testMedication1, testMedication2])
      .execute();

    const result = await getMedications(testQuery);

    expect(result).toHaveLength(2);
    const activeCount = result.filter(m => m.is_active).length;
    const inactiveCount = result.filter(m => !m.is_active).length;
    expect(activeCount).toEqual(1);
    expect(inactiveCount).toEqual(1);
  });
});

describe('getActiveMedications', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no active medications exist', async () => {
    // Create only inactive medication
    await db.insert(medicationsTable)
      .values(testMedication2)
      .execute();

    const result = await getActiveMedications(testQuery);
    expect(result).toEqual([]);
  });

  it('should return only active medications for a user', async () => {
    // Create both active and inactive medications
    await db.insert(medicationsTable)
      .values([testMedication1, testMedication2])
      .execute();

    const result = await getActiveMedications(testQuery);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Aspirin');
    expect(result[0].is_active).toEqual(true);
    expect(result[0].user_id).toEqual('user123');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should only return active medications for the specified user', async () => {
    // Create active medications for different users
    await db.insert(medicationsTable)
      .values([testMedication1, testMedication3])
      .execute();

    const result = await getActiveMedications(testQuery);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Aspirin');
    expect(result[0].user_id).toEqual('user123');
  });

  it('should return active medications ordered by created_at descending', async () => {
    const activeMedication1 = { ...testMedication1, name: 'First Active Med' };
    const activeMedication2 = { ...testMedication1, name: 'Second Active Med' };

    // Insert medications in sequence
    await db.insert(medicationsTable)
      .values(activeMedication1)
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(medicationsTable)
      .values(activeMedication2)
      .execute();

    const result = await getActiveMedications(testQuery);

    expect(result).toHaveLength(2);
    // Most recent should be first
    expect(result[0].name).toEqual('Second Active Med');
    expect(result[1].name).toEqual('First Active Med');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should not return inactive medications', async () => {
    const inactiveMedication = { ...testMedication1, is_active: false };
    
    await db.insert(medicationsTable)
      .values([testMedication1, inactiveMedication])
      .execute();

    const result = await getActiveMedications(testQuery);

    expect(result).toHaveLength(1);
    expect(result[0].is_active).toEqual(true);
    
    // Verify all returned medications are active
    result.forEach(medication => {
      expect(medication.is_active).toEqual(true);
    });
  });

  it('should handle user with no medications', async () => {
    // Create medication for different user
    await db.insert(medicationsTable)
      .values(testMedication3)
      .execute();

    const result = await getActiveMedications(testQuery);
    expect(result).toEqual([]);
  });
});