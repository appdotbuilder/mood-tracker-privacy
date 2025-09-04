import { db } from '../db';
import { moodEntriesTable } from '../db/schema';
import { type DateRangeQuery } from '../schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

// Analytics types for mood trends
export interface MoodAnalytics {
    average_mood: number;
    mood_trend: 'improving' | 'declining' | 'stable';
    total_entries: number;
    best_day: { date: Date; mood: number } | null;
    worst_day: { date: Date; mood: number } | null;
    weekly_averages: { week: string; average: number }[];
    mood_distribution: { score: number; count: number }[];
}

export const getMoodAnalytics = async (query: DateRangeQuery): Promise<MoodAnalytics> => {
    try {
        // Base query with date range filter
        const conditions = [
            eq(moodEntriesTable.user_id, query.user_id),
            gte(moodEntriesTable.created_at, query.start_date),
            lte(moodEntriesTable.created_at, query.end_date)
        ];

        // Get all mood entries in date range
        const moodEntries = await db.select()
            .from(moodEntriesTable)
            .where(and(...conditions))
            .orderBy(moodEntriesTable.created_at)
            .execute();

        if (moodEntries.length === 0) {
            return {
                average_mood: 0,
                mood_trend: 'stable',
                total_entries: 0,
                best_day: null,
                worst_day: null,
                weekly_averages: [],
                mood_distribution: []
            };
        }

        // Calculate basic statistics
        const totalEntries = moodEntries.length;
        const averageMood = moodEntries.reduce((sum, entry) => sum + entry.mood_score, 0) / totalEntries;

        // Find best and worst days
        let bestDay: { date: Date; mood: number } | null = null;
        let worstDay: { date: Date; mood: number } | null = null;

        for (const entry of moodEntries) {
            if (!bestDay || entry.mood_score > bestDay.mood) {
                bestDay = { date: entry.created_at, mood: entry.mood_score };
            }
            if (!worstDay || entry.mood_score < worstDay.mood) {
                worstDay = { date: entry.created_at, mood: entry.mood_score };
            }
        }

        // Calculate mood trend (compare first half vs second half)
        let moodTrend: 'improving' | 'declining' | 'stable' = 'stable';
        if (moodEntries.length >= 4) {
            const midpoint = Math.floor(moodEntries.length / 2);
            const firstHalf = moodEntries.slice(0, midpoint);
            const secondHalf = moodEntries.slice(-midpoint);
            
            const firstHalfAvg = firstHalf.reduce((sum, entry) => sum + entry.mood_score, 0) / firstHalf.length;
            const secondHalfAvg = secondHalf.reduce((sum, entry) => sum + entry.mood_score, 0) / secondHalf.length;
            
            const difference = secondHalfAvg - firstHalfAvg;
            if (difference > 0.5) {
                moodTrend = 'improving';
            } else if (difference < -0.5) {
                moodTrend = 'declining';
            }
        }

        // Calculate weekly averages
        const weeklyData: { [key: string]: { total: number; count: number } } = {};
        
        for (const entry of moodEntries) {
            const date = new Date(entry.created_at);
            // Get Monday of the week as the week identifier
            const monday = new Date(date);
            monday.setDate(date.getDate() - (date.getDay() + 6) % 7);
            const weekKey = monday.toISOString().split('T')[0];
            
            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = { total: 0, count: 0 };
            }
            weeklyData[weekKey].total += entry.mood_score;
            weeklyData[weekKey].count += 1;
        }

        const weeklyAverages = Object.entries(weeklyData)
            .map(([week, data]) => ({
                week,
                average: Math.round((data.total / data.count) * 100) / 100
            }))
            .sort((a, b) => a.week.localeCompare(b.week));

        // Calculate mood distribution (count of each mood score)
        const distributionMap: { [key: number]: number } = {};
        for (let i = 1; i <= 10; i++) {
            distributionMap[i] = 0;
        }

        for (const entry of moodEntries) {
            distributionMap[entry.mood_score] += 1;
        }

        const moodDistribution = Object.entries(distributionMap)
            .map(([score, count]) => ({
                score: parseInt(score),
                count: count
            }))
            .filter(item => item.count > 0)
            .sort((a, b) => a.score - b.score);

        return {
            average_mood: Math.round(averageMood * 100) / 100,
            mood_trend: moodTrend,
            total_entries: totalEntries,
            best_day: bestDay,
            worst_day: worstDay,
            weekly_averages: weeklyAverages,
            mood_distribution: moodDistribution
        };

    } catch (error) {
        console.error('Mood analytics calculation failed:', error);
        throw error;
    }
};