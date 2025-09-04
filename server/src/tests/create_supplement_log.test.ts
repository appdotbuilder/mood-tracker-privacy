import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { supplementsTable, supplementLogsTable } from '../db/schema';
import { type CreateSupplementLogInput } from '../schema';
import { createSupplementLog } from '../handlers/create_supplement_log';
import { eq } from 'drizzle-orm';

describe('createSupplementLog', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testSupplementId: number;

  beforeEach(async () => {
    // Create a test supplement for the logs
    const supplementResult = await db.insert(supplementsTable)
      .values({
        user_id: 'test-user-1',
        name: 'Vitamin D',
        dosage: '1000 IU',
        frequency: 'daily',
        is_active: true
      })
      .returning()
      .execute();
    
    testSupplementId = supplementResult[0].id;
  });

  it('should create a supplement log with all fields', async () => {
    const takenAt = new Date('2024-01-15T08:00:00Z');
    const input: CreateSupplementLogInput = {
      supplement_id: testSupplementId,
      user_id: 'test-user-1',
      taken_at: takenAt,
      notes: 'Taken with breakfast'
    };

    const result = await createSupplementLog(input);

    // Basic field validation
    expect(result.supplement_id).toBe(testSupplementId);
    expect(result.user_id).toBe('test-user-1');
    expect(result.taken_at).toEqual(takenAt);
    expect(result.notes).toBe('Taken with breakfast');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a supplement log with minimal required fields', async () => {
    const input: CreateSupplementLogInput = {
      supplement_id: testSupplementId,
      user_id: 'test-user-1'
    };

    const result = await createSupplementLog(input);

    expect(result.supplement_id).toBe(testSupplementId);
    expect(result.user_id).toBe('test-user-1');
    expect(result.taken_at).toBeInstanceOf(Date);
    expect(result.notes).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save supplement log to database', async () => {
    const input: CreateSupplementLogInput = {
      supplement_id: testSupplementId,
      user_id: 'test-user-1',
      taken_at: new Date('2024-01-15T09:30:00Z'),
      notes: 'Morning dose'
    };

    const result = await createSupplementLog(input);

    // Verify it was saved to database
    const logs = await db.select()
      .from(supplementLogsTable)
      .where(eq(supplementLogsTable.id, result.id))
      .execute();

    expect(logs).toHaveLength(1);
    expect(logs[0].supplement_id).toBe(testSupplementId);
    expect(logs[0].user_id).toBe('test-user-1');
    expect(logs[0].taken_at).toEqual(new Date('2024-01-15T09:30:00Z'));
    expect(logs[0].notes).toBe('Morning dose');
    expect(logs[0].created_at).toBeInstanceOf(Date);
  });

  it('should use current time when taken_at is not provided', async () => {
    const beforeCreate = new Date();
    
    const input: CreateSupplementLogInput = {
      supplement_id: testSupplementId,
      user_id: 'test-user-1',
      notes: 'Default time test'
    };

    const result = await createSupplementLog(input);
    const afterCreate = new Date();

    // Verify taken_at is between before and after timestamps
    expect(result.taken_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.taken_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });

  it('should throw error when supplement does not exist', async () => {
    const input: CreateSupplementLogInput = {
      supplement_id: 99999, // Non-existent supplement
      user_id: 'test-user-1',
      notes: 'This should fail'
    };

    await expect(createSupplementLog(input)).rejects.toThrow(/supplement with id 99999 not found/i);
  });

  it('should throw error when supplement belongs to different user', async () => {
    // Create supplement for different user
    const otherSupplementResult = await db.insert(supplementsTable)
      .values({
        user_id: 'other-user',
        name: 'Iron',
        dosage: '18mg',
        frequency: 'daily',
        is_active: true
      })
      .returning()
      .execute();

    const input: CreateSupplementLogInput = {
      supplement_id: otherSupplementResult[0].id,
      user_id: 'test-user-1', // Different user trying to log
      notes: 'Unauthorized access'
    };

    await expect(createSupplementLog(input)).rejects.toThrow(/does not belong to user test-user-1/i);
  });

  it('should handle null notes correctly', async () => {
    const input: CreateSupplementLogInput = {
      supplement_id: testSupplementId,
      user_id: 'test-user-1',
      taken_at: new Date('2024-01-15T10:00:00Z'),
      notes: null
    };

    const result = await createSupplementLog(input);

    expect(result.notes).toBeNull();

    // Verify in database
    const logs = await db.select()
      .from(supplementLogsTable)
      .where(eq(supplementLogsTable.id, result.id))
      .execute();

    expect(logs[0].notes).toBeNull();
  });

  it('should create multiple logs for the same supplement', async () => {
    const input1: CreateSupplementLogInput = {
      supplement_id: testSupplementId,
      user_id: 'test-user-1',
      taken_at: new Date('2024-01-15T08:00:00Z'),
      notes: 'Morning dose'
    };

    const input2: CreateSupplementLogInput = {
      supplement_id: testSupplementId,
      user_id: 'test-user-1',
      taken_at: new Date('2024-01-15T20:00:00Z'),
      notes: 'Evening dose'
    };

    const result1 = await createSupplementLog(input1);
    const result2 = await createSupplementLog(input2);

    expect(result1.id).not.toBe(result2.id);
    expect(result1.supplement_id).toBe(result2.supplement_id);
    expect(result1.user_id).toBe(result2.user_id);

    // Verify both exist in database
    const logs = await db.select()
      .from(supplementLogsTable)
      .where(eq(supplementLogsTable.supplement_id, testSupplementId))
      .execute();

    expect(logs).toHaveLength(2);
  });
});