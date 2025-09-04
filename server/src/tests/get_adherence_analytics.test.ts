import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { medicationsTable, supplementsTable, medicationLogsTable, supplementLogsTable } from '../db/schema';
import { type DateRangeQuery } from '../schema';
import { getAdherenceAnalytics } from '../handlers/get_adherence_analytics';
import { eq } from 'drizzle-orm';

// Test data
const testUserId = 'test-user-123';

const testMedication = {
    user_id: testUserId,
    name: 'Daily Vitamin D',
    dosage: '1000 IU',
    frequency: 'daily',
    is_active: true
};

const testTwiceDailyMedication = {
    user_id: testUserId,
    name: 'Blood Pressure Med',
    dosage: '10mg',
    frequency: 'twice daily',
    is_active: true
};

const testSupplement = {
    user_id: testUserId,
    name: 'Omega-3',
    dosage: '1000mg',
    frequency: 'daily',
    is_active: true
};

const testWeeklySupplement = {
    user_id: testUserId,
    name: 'B12 Weekly',
    dosage: '1000mcg',
    frequency: 'weekly',
    is_active: true
};

const createTestQuery = (daysBack: number = 7): DateRangeQuery => {
    const end_date = new Date();
    const start_date = new Date(end_date);
    start_date.setDate(start_date.getDate() - daysBack);
    
    return {
        user_id: testUserId,
        start_date,
        end_date
    };
};

describe('getAdherenceAnalytics', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return empty analytics for user with no medications or supplements', async () => {
        const query = createTestQuery();
        const result = await getAdherenceAnalytics(query);

        expect(result.medication_adherence).toHaveLength(0);
        expect(result.supplement_adherence).toHaveLength(0);
        expect(result.overall_medication_rate).toBe(0);
        expect(result.overall_supplement_rate).toBe(0);
    });

    it('should calculate perfect adherence for daily medication', async () => {
        // Create a daily medication
        const [medication] = await db.insert(medicationsTable)
            .values(testMedication)
            .returning()
            .execute();

        const query = createTestQuery(6); // 7-day period
        
        // Create logs for each day in the period
        const logs = [];
        for (let i = 0; i <= 6; i++) {
            const logDate = new Date(query.start_date);
            logDate.setDate(logDate.getDate() + i);
            logs.push({
                medication_id: medication.id,
                user_id: testUserId,
                taken_at: logDate,
                notes: null
            });
        }
        await db.insert(medicationLogsTable).values(logs).execute();

        const result = await getAdherenceAnalytics(query);

        expect(result.medication_adherence).toHaveLength(1);
        
        const medAnalytics = result.medication_adherence[0];
        expect(medAnalytics.item_name).toBe('Daily Vitamin D');
        expect(medAnalytics.item_type).toBe('medication');
        expect(medAnalytics.total_expected).toBe(7);
        expect(medAnalytics.total_logged).toBe(7);
        expect(medAnalytics.adherence_rate).toBe(100);
        expect(medAnalytics.missed_doses).toBe(0);
        expect(medAnalytics.streak_days).toBeGreaterThan(0);
        expect(medAnalytics.weekly_adherence).toHaveLength(1);
        
        expect(result.overall_medication_rate).toBe(100);
    });

    it('should calculate partial adherence for missed doses', async () => {
        // Create a daily medication
        const [medication] = await db.insert(medicationsTable)
            .values(testMedication)
            .returning()
            .execute();

        const query = createTestQuery(6); // 7-day period
        
        // Create logs for only 4 out of 7 days
        const logs = [];
        for (let i = 0; i < 4; i++) {
            const logDate = new Date(query.start_date);
            logDate.setDate(logDate.getDate() + i);
            logs.push({
                medication_id: medication.id,
                user_id: testUserId,
                taken_at: logDate,
                notes: null
            });
        }
        await db.insert(medicationLogsTable).values(logs).execute();

        const result = await getAdherenceAnalytics(query);

        const medAnalytics = result.medication_adherence[0];
        expect(medAnalytics.total_expected).toBe(7);
        expect(medAnalytics.total_logged).toBe(4);
        expect(medAnalytics.adherence_rate).toBe(57); // 4/7 = 57%
        expect(medAnalytics.missed_doses).toBe(3);
    });

    it('should handle twice daily medication correctly', async () => {
        // Create a twice daily medication
        const [medication] = await db.insert(medicationsTable)
            .values(testTwiceDailyMedication)
            .returning()
            .execute();

        // Use explicit dates to avoid timezone issues
        const start_date = new Date('2024-01-01T00:00:00Z');
        const end_date = new Date('2024-01-03T23:59:59Z');
        const query: DateRangeQuery = {
            user_id: testUserId,
            start_date,
            end_date
        };
        
        // Insert logs for 3 days, twice daily (6 total)
        for (let day = 0; day < 3; day++) {
            for (let dose = 0; dose < 2; dose++) {
                const logDate = new Date('2024-01-01T00:00:00Z');
                logDate.setDate(logDate.getDate() + day);
                logDate.setHours(dose === 0 ? 8 : 20, 0, 0, 0); // Morning and evening
                
                await db.insert(medicationLogsTable).values({
                    medication_id: medication.id,
                    user_id: testUserId,
                    taken_at: logDate,
                    notes: null
                }).execute();
            }
        }

        const result = await getAdherenceAnalytics(query);

        const medAnalytics = result.medication_adherence[0];
        expect(medAnalytics.total_expected).toBe(6); // 2 doses/day * 3 days
        expect(medAnalytics.total_logged).toBe(6);
        expect(medAnalytics.adherence_rate).toBe(100);
        expect(medAnalytics.missed_doses).toBe(0);
    });

    it('should handle weekly supplements correctly', async () => {
        // Create a weekly supplement
        const [supplement] = await db.insert(supplementsTable)
            .values(testWeeklySupplement)
            .returning()
            .execute();

        const query = createTestQuery(13); // 14-day period (2 weeks)
        
        // Create logs for 2 doses (once per week)
        const logs = [];
        for (let week = 0; week < 2; week++) {
            const logDate = new Date(query.start_date);
            logDate.setDate(logDate.getDate() + (week * 7));
            logs.push({
                supplement_id: supplement.id,
                user_id: testUserId,
                taken_at: logDate,
                notes: null
            });
        }
        await db.insert(supplementLogsTable).values(logs).execute();

        const result = await getAdherenceAnalytics(query);

        const suppAnalytics = result.supplement_adherence[0];
        expect(suppAnalytics.total_expected).toBe(2); // 14 days / 7 = 2 doses
        expect(suppAnalytics.total_logged).toBe(2);
        expect(suppAnalytics.adherence_rate).toBe(100);
        expect(suppAnalytics.missed_doses).toBe(0);
    });

    it('should calculate weekly adherence patterns', async () => {
        // Create a daily medication
        const [medication] = await db.insert(medicationsTable)
            .values(testMedication)
            .returning()
            .execute();

        // Use a specific 14-day period for better predictability
        const start_date = new Date('2024-01-01');
        const end_date = new Date('2024-01-14');
        const query: DateRangeQuery = {
            user_id: testUserId,
            start_date,
            end_date
        };
        
        // First week (Jan 1-7): 7 doses (100%)
        for (let i = 0; i < 7; i++) {
            const logDate = new Date(start_date);
            logDate.setDate(logDate.getDate() + i);
            
            await db.insert(medicationLogsTable).values({
                medication_id: medication.id,
                user_id: testUserId,
                taken_at: logDate,
                notes: null
            }).execute();
        }
        
        // Second week (Jan 8-14): 3 doses only (43%)
        for (let i = 7; i < 10; i++) {
            const logDate = new Date(start_date);
            logDate.setDate(logDate.getDate() + i);
            
            await db.insert(medicationLogsTable).values({
                medication_id: medication.id,
                user_id: testUserId,
                taken_at: logDate,
                notes: null
            }).execute();
        }

        const result = await getAdherenceAnalytics(query);

        const medAnalytics = result.medication_adherence[0];
        expect(medAnalytics.total_expected).toBe(14);
        expect(medAnalytics.total_logged).toBe(10);
        expect(medAnalytics.adherence_rate).toBe(71); // 10/14 = 71%
        
        // Weekly adherence should show different patterns
        expect(medAnalytics.weekly_adherence.length).toBeGreaterThan(0);
    });

    it('should calculate overall rates correctly with multiple items', async () => {
        // Create medications and supplements
        const [medication] = await db.insert(medicationsTable)
            .values(testMedication)
            .returning()
            .execute();
            
        const [supplement] = await db.insert(supplementsTable)
            .values(testSupplement)
            .returning()
            .execute();

        const query = createTestQuery(2); // 3-day period
        
        // Create medication logs - 2 out of 3 days (67% adherence)
        const medLogs = [];
        for (let i = 0; i < 2; i++) {
            const logDate = new Date(query.start_date);
            logDate.setDate(logDate.getDate() + i);
            medLogs.push({
                medication_id: medication.id,
                user_id: testUserId,
                taken_at: logDate,
                notes: null
            });
        }
        await db.insert(medicationLogsTable).values(medLogs).execute();
        
        // Create supplement logs - 3 out of 3 days (100% adherence)
        const suppLogs = [];
        for (let i = 0; i < 3; i++) {
            const logDate = new Date(query.start_date);
            logDate.setDate(logDate.getDate() + i);
            suppLogs.push({
                supplement_id: supplement.id,
                user_id: testUserId,
                taken_at: logDate,
                notes: null
            });
        }
        await db.insert(supplementLogsTable).values(suppLogs).execute();

        const result = await getAdherenceAnalytics(query);

        expect(result.medication_adherence).toHaveLength(1);
        expect(result.supplement_adherence).toHaveLength(1);
        expect(result.medication_adherence[0].adherence_rate).toBe(67);
        expect(result.supplement_adherence[0].adherence_rate).toBe(100);
        expect(result.overall_medication_rate).toBe(67);
        expect(result.overall_supplement_rate).toBe(100);
    });

    it('should only include active medications and supplements', async () => {
        // Create active and inactive items
        await db.insert(medicationsTable)
            .values([
                { ...testMedication, is_active: true },
                { ...testMedication, name: 'Inactive Med', is_active: false }
            ])
            .execute();
            
        await db.insert(supplementsTable)
            .values([
                { ...testSupplement, is_active: true },
                { ...testSupplement, name: 'Inactive Supp', is_active: false }
            ])
            .execute();

        const query = createTestQuery();
        const result = await getAdherenceAnalytics(query);

        expect(result.medication_adherence).toHaveLength(1);
        expect(result.supplement_adherence).toHaveLength(1);
        expect(result.medication_adherence[0].item_name).toBe('Daily Vitamin D');
        expect(result.supplement_adherence[0].item_name).toBe('Omega-3');
    });

    it('should handle date range boundaries correctly', async () => {
        // Create a daily medication
        const [medication] = await db.insert(medicationsTable)
            .values(testMedication)
            .returning()
            .execute();

        const query = createTestQuery(6); // 7-day period
        
        // Create logs: some inside range, some outside
        const logs = [];
        
        // One log before range
        const beforeDate = new Date(query.start_date);
        beforeDate.setDate(beforeDate.getDate() - 1);
        logs.push({
            medication_id: medication.id,
            user_id: testUserId,
            taken_at: beforeDate,
            notes: null
        });
        
        // Logs within range
        for (let i = 0; i < 3; i++) {
            const logDate = new Date(query.start_date);
            logDate.setDate(logDate.getDate() + i);
            logs.push({
                medication_id: medication.id,
                user_id: testUserId,
                taken_at: logDate,
                notes: null
            });
        }
        
        // One log after range
        const afterDate = new Date(query.end_date);
        afterDate.setDate(afterDate.getDate() + 1);
        logs.push({
            medication_id: medication.id,
            user_id: testUserId,
            taken_at: afterDate,
            notes: null
        });
        
        await db.insert(medicationLogsTable).values(logs).execute();

        const result = await getAdherenceAnalytics(query);

        const medAnalytics = result.medication_adherence[0];
        expect(medAnalytics.total_expected).toBe(7);
        expect(medAnalytics.total_logged).toBe(3); // Only logs within range count
        expect(medAnalytics.adherence_rate).toBe(43); // 3/7 = 43%
    });

    it('should handle PRN (as needed) medications correctly', async () => {
        // Create a PRN medication
        const [medication] = await db.insert(medicationsTable)
            .values({
                ...testMedication,
                name: 'Pain Relief',
                frequency: 'as needed'
            })
            .returning()
            .execute();

        const query = createTestQuery();
        
        // Create some logs
        const logs = [];
        for (let i = 0; i < 3; i++) {
            const logDate = new Date(query.start_date);
            logDate.setDate(logDate.getDate() + i);
            logs.push({
                medication_id: medication.id,
                user_id: testUserId,
                taken_at: logDate,
                notes: null
            });
        }
        await db.insert(medicationLogsTable).values(logs).execute();

        const result = await getAdherenceAnalytics(query);

        const medAnalytics = result.medication_adherence[0];
        expect(medAnalytics.total_expected).toBe(0); // PRN has no expected doses
        expect(medAnalytics.total_logged).toBe(3);
        expect(medAnalytics.adherence_rate).toBe(0); // No expected doses = 0% rate
        expect(medAnalytics.missed_doses).toBe(0);
        expect(medAnalytics.streak_days).toBe(0); // PRN doesn't have streaks
    });
});