import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { supplementsTable } from '../db/schema';
import { type UserDataQuery } from '../schema';
import { getSupplements, getActiveSupplements } from '../handlers/get_supplements';

const testQuery: UserDataQuery = {
  user_id: 'test-user-123'
};

const testSupplementData = [
  {
    user_id: 'test-user-123',
    name: 'Vitamin D3',
    dosage: '2000 IU',
    frequency: 'daily',
    is_active: true
  },
  {
    user_id: 'test-user-123',
    name: 'Omega-3',
    dosage: '1000mg',
    frequency: 'twice daily',
    is_active: true
  },
  {
    user_id: 'test-user-123',
    name: 'Magnesium',
    dosage: '400mg',
    frequency: 'daily',
    is_active: false
  },
  {
    user_id: 'other-user-456',
    name: 'Vitamin C',
    dosage: '500mg',
    frequency: 'daily',
    is_active: true
  }
];

describe('getSupplements', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all supplements for a user', async () => {
    // Insert test data
    await db.insert(supplementsTable)
      .values(testSupplementData)
      .execute();

    const result = await getSupplements(testQuery);

    // Should return 3 supplements for test-user-123 (including inactive)
    expect(result).toHaveLength(3);
    
    // Verify all supplements belong to the correct user
    result.forEach(supplement => {
      expect(supplement.user_id).toEqual('test-user-123');
    });

    // Verify all expected supplements are present
    const supplementNames = result.map(s => s.name).sort();
    expect(supplementNames).toEqual(['Magnesium', 'Omega-3', 'Vitamin D3']);
  });

  it('should return empty array for user with no supplements', async () => {
    const result = await getSupplements({ user_id: 'nonexistent-user' });

    expect(result).toHaveLength(0);
  });

  it('should return supplements ordered by creation date (newest first)', async () => {
    // Insert supplements with different timestamps
    const supplement1 = await db.insert(supplementsTable)
      .values({
        user_id: 'test-user-123',
        name: 'First Supplement',
        dosage: '100mg',
        frequency: 'daily',
        is_active: true
      })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const supplement2 = await db.insert(supplementsTable)
      .values({
        user_id: 'test-user-123',
        name: 'Second Supplement',
        dosage: '200mg',
        frequency: 'daily',
        is_active: true
      })
      .returning()
      .execute();

    const result = await getSupplements(testQuery);

    expect(result).toHaveLength(2);
    // Newest first (Second Supplement should come first)
    expect(result[0].name).toEqual('Second Supplement');
    expect(result[1].name).toEqual('First Supplement');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should include both active and inactive supplements', async () => {
    await db.insert(supplementsTable)
      .values([
        {
          user_id: 'test-user-123',
          name: 'Active Supplement',
          dosage: '100mg',
          frequency: 'daily',
          is_active: true
        },
        {
          user_id: 'test-user-123',
          name: 'Inactive Supplement',
          dosage: '200mg',
          frequency: 'daily',
          is_active: false
        }
      ])
      .execute();

    const result = await getSupplements(testQuery);

    expect(result).toHaveLength(2);
    
    const activeCount = result.filter(s => s.is_active).length;
    const inactiveCount = result.filter(s => !s.is_active).length;
    
    expect(activeCount).toBe(1);
    expect(inactiveCount).toBe(1);
  });

  it('should return supplements with all expected fields', async () => {
    await db.insert(supplementsTable)
      .values({
        user_id: 'test-user-123',
        name: 'Test Supplement',
        dosage: '500mg',
        frequency: 'twice daily',
        is_active: true
      })
      .execute();

    const result = await getSupplements(testQuery);

    expect(result).toHaveLength(1);
    
    const supplement = result[0];
    expect(supplement.id).toBeDefined();
    expect(supplement.user_id).toEqual('test-user-123');
    expect(supplement.name).toEqual('Test Supplement');
    expect(supplement.dosage).toEqual('500mg');
    expect(supplement.frequency).toEqual('twice daily');
    expect(supplement.is_active).toBe(true);
    expect(supplement.created_at).toBeInstanceOf(Date);
    expect(supplement.updated_at).toBeInstanceOf(Date);
  });
});

describe('getActiveSupplements', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return only active supplements for a user', async () => {
    await db.insert(supplementsTable)
      .values(testSupplementData)
      .execute();

    const result = await getActiveSupplements(testQuery);

    // Should return only 2 active supplements for test-user-123
    expect(result).toHaveLength(2);
    
    // Verify all returned supplements are active
    result.forEach(supplement => {
      expect(supplement.user_id).toEqual('test-user-123');
      expect(supplement.is_active).toBe(true);
    });

    // Verify expected active supplements are present
    const supplementNames = result.map(s => s.name).sort();
    expect(supplementNames).toEqual(['Omega-3', 'Vitamin D3']);
  });

  it('should return empty array for user with no active supplements', async () => {
    // Insert only inactive supplements
    await db.insert(supplementsTable)
      .values([
        {
          user_id: 'test-user-123',
          name: 'Inactive Supplement 1',
          dosage: '100mg',
          frequency: 'daily',
          is_active: false
        },
        {
          user_id: 'test-user-123',
          name: 'Inactive Supplement 2',
          dosage: '200mg',
          frequency: 'daily',
          is_active: false
        }
      ])
      .execute();

    const result = await getActiveSupplements(testQuery);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for nonexistent user', async () => {
    const result = await getActiveSupplements({ user_id: 'nonexistent-user' });

    expect(result).toHaveLength(0);
  });

  it('should return active supplements ordered by creation date (newest first)', async () => {
    const supplement1 = await db.insert(supplementsTable)
      .values({
        user_id: 'test-user-123',
        name: 'First Active',
        dosage: '100mg',
        frequency: 'daily',
        is_active: true
      })
      .returning()
      .execute();

    // Wait to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const supplement2 = await db.insert(supplementsTable)
      .values({
        user_id: 'test-user-123',
        name: 'Second Active',
        dosage: '200mg',
        frequency: 'daily',
        is_active: true
      })
      .returning()
      .execute();

    // Add an inactive supplement (should not appear in results)
    await db.insert(supplementsTable)
      .values({
        user_id: 'test-user-123',
        name: 'Inactive',
        dosage: '300mg',
        frequency: 'daily',
        is_active: false
      })
      .execute();

    const result = await getActiveSupplements(testQuery);

    expect(result).toHaveLength(2);
    // All should be active
    result.forEach(supplement => {
      expect(supplement.is_active).toBe(true);
    });
    
    // Newest first
    expect(result[0].name).toEqual('Second Active');
    expect(result[1].name).toEqual('First Active');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should not return supplements from other users', async () => {
    await db.insert(supplementsTable)
      .values([
        {
          user_id: 'test-user-123',
          name: 'User 123 Supplement',
          dosage: '100mg',
          frequency: 'daily',
          is_active: true
        },
        {
          user_id: 'other-user-456',
          name: 'User 456 Supplement',
          dosage: '200mg',
          frequency: 'daily',
          is_active: true
        }
      ])
      .execute();

    const result = await getActiveSupplements(testQuery);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual('test-user-123');
    expect(result[0].name).toEqual('User 123 Supplement');
  });

  it('should handle supplements with null dosage', async () => {
    await db.insert(supplementsTable)
      .values({
        user_id: 'test-user-123',
        name: 'Supplement Without Dosage',
        dosage: null,
        frequency: 'daily',
        is_active: true
      })
      .execute();

    const result = await getActiveSupplements(testQuery);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Supplement Without Dosage');
    expect(result[0].dosage).toBeNull();
    expect(result[0].is_active).toBe(true);
  });
});