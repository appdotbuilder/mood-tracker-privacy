import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { moodEntriesTable } from '../db/schema';
import { type DateRangeQuery } from '../schema';
import { getMoodAnalytics } from '../handlers/get_mood_analytics';

// Helper function to create mood entries for testing
const createMoodEntry = async (userId: string, moodScore: number, createdAt: Date, notes?: string) => {
    const result = await db.insert(moodEntriesTable)
        .values({
            user_id: userId,
            mood_score: moodScore,
            notes: notes || null,
            created_at: createdAt,
            updated_at: createdAt
        })
        .returning()
        .execute();
    return result[0];
};

describe('getMoodAnalytics', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    const testUserId = 'test-user-123';
    const otherUserId = 'other-user-456';

    it('should return empty analytics for user with no mood entries', async () => {
        const query: DateRangeQuery = {
            user_id: testUserId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
        };

        const result = await getMoodAnalytics(query);

        expect(result.average_mood).toEqual(0);
        expect(result.mood_trend).toEqual('stable');
        expect(result.total_entries).toEqual(0);
        expect(result.best_day).toBeNull();
        expect(result.worst_day).toBeNull();
        expect(result.weekly_averages).toEqual([]);
        expect(result.mood_distribution).toEqual([]);
    });

    it('should calculate basic analytics for single mood entry', async () => {
        const testDate = new Date('2024-01-15T10:00:00Z');
        await createMoodEntry(testUserId, 7, testDate, 'Feeling good today');

        const query: DateRangeQuery = {
            user_id: testUserId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
        };

        const result = await getMoodAnalytics(query);

        expect(result.average_mood).toEqual(7);
        expect(result.mood_trend).toEqual('stable');
        expect(result.total_entries).toEqual(1);
        expect(result.best_day).toEqual({ date: testDate, mood: 7 });
        expect(result.worst_day).toEqual({ date: testDate, mood: 7 });
        expect(result.weekly_averages).toHaveLength(1);
        expect(result.weekly_averages[0].average).toEqual(7);
        expect(result.mood_distribution).toEqual([{ score: 7, count: 1 }]);
    });

    it('should calculate analytics for multiple mood entries', async () => {
        // Create mood entries over several days
        await createMoodEntry(testUserId, 5, new Date('2024-01-01T10:00:00Z'));
        await createMoodEntry(testUserId, 8, new Date('2024-01-02T10:00:00Z'));
        await createMoodEntry(testUserId, 3, new Date('2024-01-03T10:00:00Z'));
        await createMoodEntry(testUserId, 9, new Date('2024-01-04T10:00:00Z'));
        await createMoodEntry(testUserId, 6, new Date('2024-01-05T10:00:00Z'));

        const query: DateRangeQuery = {
            user_id: testUserId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
        };

        const result = await getMoodAnalytics(query);

        // Average: (5 + 8 + 3 + 9 + 6) / 5 = 6.2
        expect(result.average_mood).toEqual(6.2);
        expect(result.total_entries).toEqual(5);
        expect(result.best_day!.mood).toEqual(9);
        expect(result.worst_day!.mood).toEqual(3);
        
        // Check mood distribution
        const distribution = result.mood_distribution;
        expect(distribution.find(d => d.score === 3)?.count).toEqual(1);
        expect(distribution.find(d => d.score === 5)?.count).toEqual(1);
        expect(distribution.find(d => d.score === 6)?.count).toEqual(1);
        expect(distribution.find(d => d.score === 8)?.count).toEqual(1);
        expect(distribution.find(d => d.score === 9)?.count).toEqual(1);
    });

    it('should detect improving mood trend', async () => {
        // Create entries with improving trend (low to high scores)
        await createMoodEntry(testUserId, 3, new Date('2024-01-01T10:00:00Z'));
        await createMoodEntry(testUserId, 4, new Date('2024-01-02T10:00:00Z'));
        await createMoodEntry(testUserId, 7, new Date('2024-01-03T10:00:00Z'));
        await createMoodEntry(testUserId, 8, new Date('2024-01-04T10:00:00Z'));

        const query: DateRangeQuery = {
            user_id: testUserId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
        };

        const result = await getMoodAnalytics(query);

        expect(result.mood_trend).toEqual('improving');
    });

    it('should detect declining mood trend', async () => {
        // Create entries with declining trend (high to low scores)
        await createMoodEntry(testUserId, 8, new Date('2024-01-01T10:00:00Z'));
        await createMoodEntry(testUserId, 7, new Date('2024-01-02T10:00:00Z'));
        await createMoodEntry(testUserId, 4, new Date('2024-01-03T10:00:00Z'));
        await createMoodEntry(testUserId, 3, new Date('2024-01-04T10:00:00Z'));

        const query: DateRangeQuery = {
            user_id: testUserId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
        };

        const result = await getMoodAnalytics(query);

        expect(result.mood_trend).toEqual('declining');
    });

    it('should detect stable mood trend', async () => {
        // Create entries with stable trend
        await createMoodEntry(testUserId, 6, new Date('2024-01-01T10:00:00Z'));
        await createMoodEntry(testUserId, 5, new Date('2024-01-02T10:00:00Z'));
        await createMoodEntry(testUserId, 6, new Date('2024-01-03T10:00:00Z'));
        await createMoodEntry(testUserId, 5, new Date('2024-01-04T10:00:00Z'));

        const query: DateRangeQuery = {
            user_id: testUserId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
        };

        const result = await getMoodAnalytics(query);

        expect(result.mood_trend).toEqual('stable');
    });

    it('should calculate weekly averages correctly', async () => {
        // Create entries across multiple weeks
        // Week 1: Jan 1-7 (Monday is Dec 30, 2024)
        await createMoodEntry(testUserId, 5, new Date('2024-01-01T10:00:00Z')); // Monday
        await createMoodEntry(testUserId, 7, new Date('2024-01-03T10:00:00Z')); // Wednesday

        // Week 2: Jan 8-14 (Monday is Jan 8)
        await createMoodEntry(testUserId, 8, new Date('2024-01-08T10:00:00Z')); // Monday
        await createMoodEntry(testUserId, 6, new Date('2024-01-10T10:00:00Z')); // Wednesday

        const query: DateRangeQuery = {
            user_id: testUserId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
        };

        const result = await getMoodAnalytics(query);

        expect(result.weekly_averages).toHaveLength(2);
        // First week average: (5 + 7) / 2 = 6
        // Second week average: (8 + 6) / 2 = 7
        const weeklyAvgs = result.weekly_averages.sort((a, b) => a.week.localeCompare(b.week));
        expect(weeklyAvgs[0].average).toEqual(6);
        expect(weeklyAvgs[1].average).toEqual(7);
    });

    it('should filter by date range correctly', async () => {
        // Create entries outside and inside date range
        await createMoodEntry(testUserId, 3, new Date('2023-12-31T10:00:00Z')); // Outside range
        await createMoodEntry(testUserId, 7, new Date('2024-01-15T10:00:00Z')); // Inside range
        await createMoodEntry(testUserId, 9, new Date('2024-02-01T10:00:00Z')); // Outside range

        const query: DateRangeQuery = {
            user_id: testUserId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
        };

        const result = await getMoodAnalytics(query);

        expect(result.total_entries).toEqual(1);
        expect(result.average_mood).toEqual(7);
        expect(result.mood_distribution).toEqual([{ score: 7, count: 1 }]);
    });

    it('should filter by user_id correctly', async () => {
        // Create entries for different users
        await createMoodEntry(testUserId, 7, new Date('2024-01-15T10:00:00Z'));
        await createMoodEntry(otherUserId, 3, new Date('2024-01-16T10:00:00Z'));

        const query: DateRangeQuery = {
            user_id: testUserId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
        };

        const result = await getMoodAnalytics(query);

        expect(result.total_entries).toEqual(1);
        expect(result.average_mood).toEqual(7);
        expect(result.best_day!.mood).toEqual(7);
        expect(result.worst_day!.mood).toEqual(7);
    });

    it('should handle mood distribution with duplicate scores', async () => {
        // Create multiple entries with same mood scores
        await createMoodEntry(testUserId, 5, new Date('2024-01-01T10:00:00Z'));
        await createMoodEntry(testUserId, 5, new Date('2024-01-02T10:00:00Z'));
        await createMoodEntry(testUserId, 7, new Date('2024-01-03T10:00:00Z'));
        await createMoodEntry(testUserId, 7, new Date('2024-01-04T10:00:00Z'));
        await createMoodEntry(testUserId, 7, new Date('2024-01-05T10:00:00Z'));

        const query: DateRangeQuery = {
            user_id: testUserId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
        };

        const result = await getMoodAnalytics(query);

        expect(result.total_entries).toEqual(5);
        expect(result.mood_distribution).toEqual([
            { score: 5, count: 2 },
            { score: 7, count: 3 }
        ]);
    });

    it('should handle edge case with small number of entries for trend calculation', async () => {
        // Create only 2 entries - should remain stable
        await createMoodEntry(testUserId, 3, new Date('2024-01-01T10:00:00Z'));
        await createMoodEntry(testUserId, 8, new Date('2024-01-02T10:00:00Z'));

        const query: DateRangeQuery = {
            user_id: testUserId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
        };

        const result = await getMoodAnalytics(query);

        expect(result.mood_trend).toEqual('stable'); // Less than 4 entries should be stable
        expect(result.total_entries).toEqual(2);
        expect(result.average_mood).toEqual(5.5);
    });
});