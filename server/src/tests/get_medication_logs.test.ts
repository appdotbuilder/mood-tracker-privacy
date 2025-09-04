import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicationsTable, medicationLogsTable } from '../db/schema';
import { type UserDataQuery, type DateRangeQuery } from '../schema';
import { getMedicationLogs, getMedicationLogsByDateRange } from '../handlers/get_medication_logs';

describe('getMedicationLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testUserId = 'test-user-123';
  const otherUserId = 'other-user-456';

  it('should return empty array when user has no medication logs', async () => {
    const query: UserDataQuery = { user_id: testUserId };
    const result = await getMedicationLogs(query);

    expect(result).toEqual([]);
  });

  it('should return medication logs for specific user', async () => {
    // Create medication first
    const medicationResult = await db.insert(medicationsTable)
      .values({
        user_id: testUserId,
        name: 'Vitamin D',
        dosage: '1000IU',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const medicationId = medicationResult[0].id;

    // Create medication logs
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    await db.insert(medicationLogsTable)
      .values([
        {
          medication_id: medicationId,
          user_id: testUserId,
          taken_at: now,
          notes: 'Took with breakfast'
        },
        {
          medication_id: medicationId,
          user_id: testUserId,
          taken_at: yesterday,
          notes: null
        }
      ])
      .execute();

    const query: UserDataQuery = { user_id: testUserId };
    const result = await getMedicationLogs(query);

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toBe(testUserId);
    expect(result[0].medication_id).toBe(medicationId);
    expect(result[0].taken_at).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    
    // Should be ordered by taken_at desc (newest first)
    expect(result[0].taken_at >= result[1].taken_at).toBe(true);
  });

  it('should only return logs for the specified user', async () => {
    // Create medications for both users
    const medication1Result = await db.insert(medicationsTable)
      .values({
        user_id: testUserId,
        name: 'Aspirin',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const medication2Result = await db.insert(medicationsTable)
      .values({
        user_id: otherUserId,
        name: 'Ibuprofen',
        frequency: 'as needed'
      })
      .returning()
      .execute();

    // Create logs for both users
    await db.insert(medicationLogsTable)
      .values([
        {
          medication_id: medication1Result[0].id,
          user_id: testUserId,
          notes: 'Test user log'
        },
        {
          medication_id: medication2Result[0].id,
          user_id: otherUserId,
          notes: 'Other user log'
        }
      ])
      .execute();

    const query: UserDataQuery = { user_id: testUserId };
    const result = await getMedicationLogs(query);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(testUserId);
    expect(result[0].notes).toBe('Test user log');
  });

  it('should handle multiple medications for same user', async () => {
    // Create two different medications
    const medication1Result = await db.insert(medicationsTable)
      .values({
        user_id: testUserId,
        name: 'Vitamin D',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const medication2Result = await db.insert(medicationsTable)
      .values({
        user_id: testUserId,
        name: 'Omega-3',
        frequency: 'twice daily'
      })
      .returning()
      .execute();

    // Create logs for both medications
    await db.insert(medicationLogsTable)
      .values([
        {
          medication_id: medication1Result[0].id,
          user_id: testUserId,
          notes: 'Vitamin D taken'
        },
        {
          medication_id: medication2Result[0].id,
          user_id: testUserId,
          notes: 'Omega-3 taken'
        }
      ])
      .execute();

    const query: UserDataQuery = { user_id: testUserId };
    const result = await getMedicationLogs(query);

    expect(result).toHaveLength(2);
    
    // Should contain logs from both medications
    const medicationIds = result.map(log => log.medication_id);
    expect(medicationIds).toContain(medication1Result[0].id);
    expect(medicationIds).toContain(medication2Result[0].id);
  });
});

describe('getMedicationLogsByDateRange', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testUserId = 'test-user-123';

  it('should return empty array when no logs in date range', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const query: DateRangeQuery = {
      user_id: testUserId,
      start_date: startDate,
      end_date: endDate
    };

    const result = await getMedicationLogsByDateRange(query);
    expect(result).toEqual([]);
  });

  it('should return logs within date range', async () => {
    // Create medication
    const medicationResult = await db.insert(medicationsTable)
      .values({
        user_id: testUserId,
        name: 'Daily Vitamin',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const medicationId = medicationResult[0].id;

    // Create logs with different dates
    const jan1 = new Date('2024-01-01T10:00:00Z');
    const jan15 = new Date('2024-01-15T10:00:00Z');
    const jan31 = new Date('2024-01-31T10:00:00Z');
    const feb1 = new Date('2024-02-01T10:00:00Z');

    await db.insert(medicationLogsTable)
      .values([
        {
          medication_id: medicationId,
          user_id: testUserId,
          taken_at: jan1,
          notes: 'Jan 1 dose'
        },
        {
          medication_id: medicationId,
          user_id: testUserId,
          taken_at: jan15,
          notes: 'Jan 15 dose'
        },
        {
          medication_id: medicationId,
          user_id: testUserId,
          taken_at: jan31,
          notes: 'Jan 31 dose'
        },
        {
          medication_id: medicationId,
          user_id: testUserId,
          taken_at: feb1,
          notes: 'Feb 1 dose (outside range)'
        }
      ])
      .execute();

    // Query for January logs
    const query: DateRangeQuery = {
      user_id: testUserId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31T23:59:59Z')
    };

    const result = await getMedicationLogsByDateRange(query);

    expect(result).toHaveLength(3);
    
    // Should only contain logs from January
    const notes = result.map(log => log.notes);
    expect(notes).toContain('Jan 1 dose');
    expect(notes).toContain('Jan 15 dose');
    expect(notes).toContain('Jan 31 dose');
    expect(notes).not.toContain('Feb 1 dose (outside range)');

    // Should be ordered by taken_at desc
    expect(result[0].notes).toBe('Jan 31 dose');
    expect(result[2].notes).toBe('Jan 1 dose');
  });

  it('should filter by user_id within date range', async () => {
    const otherUserId = 'other-user-456';

    // Create medications for both users
    const medication1Result = await db.insert(medicationsTable)
      .values({
        user_id: testUserId,
        name: 'User 1 Med',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const medication2Result = await db.insert(medicationsTable)
      .values({
        user_id: otherUserId,
        name: 'User 2 Med',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const targetDate = new Date('2024-01-15T10:00:00Z');

    // Create logs for both users on the same date
    await db.insert(medicationLogsTable)
      .values([
        {
          medication_id: medication1Result[0].id,
          user_id: testUserId,
          taken_at: targetDate,
          notes: 'Target user log'
        },
        {
          medication_id: medication2Result[0].id,
          user_id: otherUserId,
          taken_at: targetDate,
          notes: 'Other user log'
        }
      ])
      .execute();

    const query: DateRangeQuery = {
      user_id: testUserId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getMedicationLogsByDateRange(query);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(testUserId);
    expect(result[0].notes).toBe('Target user log');
  });

  it('should handle inclusive date boundaries', async () => {
    // Create medication
    const medicationResult = await db.insert(medicationsTable)
      .values({
        user_id: testUserId,
        name: 'Boundary Test Med',
        frequency: 'daily'
      })
      .returning()
      .execute();

    const medicationId = medicationResult[0].id;

    // Create logs exactly on boundaries
    const startBoundary = new Date('2024-01-01T00:00:00Z');
    const endBoundary = new Date('2024-01-31T23:59:59Z');

    await db.insert(medicationLogsTable)
      .values([
        {
          medication_id: medicationId,
          user_id: testUserId,
          taken_at: startBoundary,
          notes: 'Start boundary'
        },
        {
          medication_id: medicationId,
          user_id: testUserId,
          taken_at: endBoundary,
          notes: 'End boundary'
        }
      ])
      .execute();

    const query: DateRangeQuery = {
      user_id: testUserId,
      start_date: startBoundary,
      end_date: endBoundary
    };

    const result = await getMedicationLogsByDateRange(query);

    expect(result).toHaveLength(2);
    const notes = result.map(log => log.notes);
    expect(notes).toContain('Start boundary');
    expect(notes).toContain('End boundary');
  });
});