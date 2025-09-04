import { db } from '../db';
import { habitsTable, habitLogsTable } from '../db/schema';
import { type DateRangeQuery } from '../schema';
import { eq, and, gte, lte, desc, asc, count, sql } from 'drizzle-orm';

// Analytics types for habit tracking
export interface HabitAnalytics {
    habit_id: number;
    habit_name: string;
    completion_rate: number; // percentage
    current_streak: number; // days
    longest_streak: number; // days
    total_completions: number;
    weekly_completions: { week: string; completions: number }[];
    consistency_score: number; // 0-100 score
}

export interface OverallHabitAnalytics {
    total_habits: number;
    active_habits: number;
    overall_completion_rate: number;
    habits: HabitAnalytics[];
}

// Helper function to calculate streak from completion dates
const calculateStreaks = (completionDates: Date[], endDate: Date): { current: number; longest: number } => {
    if (completionDates.length === 0) {
        return { current: 0, longest: 0 };
    }

    // Sort dates in descending order (most recent first)
    const sortedDates = completionDates.sort((a, b) => b.getTime() - a.getTime());
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    // Check current streak from end date backwards
    let checkDate = new Date(endDate);
    let dateIndex = 0;
    
    while (dateIndex < sortedDates.length) {
        const completionDate = new Date(sortedDates[dateIndex]);
        const daysDiff = Math.floor((checkDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) {
            currentStreak++;
            tempStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
            dateIndex++;
        } else if (daysDiff === 1) {
            // Gap of one day, move check date back
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            // Gap larger than one day, current streak ends
            break;
        }
    }
    
    // Calculate longest streak by examining all dates
    tempStreak = 0;
    const allDates = sortedDates.sort((a, b) => a.getTime() - b.getTime()); // Sort ascending
    
    for (let i = 0; i < allDates.length; i++) {
        if (i === 0) {
            tempStreak = 1;
        } else {
            const prevDate = allDates[i - 1];
            const currDate = allDates[i];
            const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    
    return { current: currentStreak, longest: longestStreak };
};

// Helper function to get week start date
const getWeekStart = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Adjust to get Sunday as start of week
    const weekStart = new Date(d.setDate(diff));
    return weekStart.toISOString().split('T')[0];
};

export const getHabitAnalytics = async (query: DateRangeQuery): Promise<OverallHabitAnalytics> => {
    try {
        const { user_id, start_date, end_date } = query;

        // Get all habits for the user
        const habits = await db.select()
            .from(habitsTable)
            .where(eq(habitsTable.user_id, user_id))
            .orderBy(habitsTable.name)
            .execute();

        // Get habit logs for the date range
        const habitLogs = await db.select({
            habit_id: habitLogsTable.habit_id,
            completed_at: habitLogsTable.completed_at
        })
            .from(habitLogsTable)
            .where(
                and(
                    eq(habitLogsTable.user_id, user_id),
                    gte(habitLogsTable.completed_at, start_date),
                    lte(habitLogsTable.completed_at, end_date)
                )
            )
            .orderBy(desc(habitLogsTable.completed_at))
            .execute();

        // Calculate date range in days
        const totalDays = Math.ceil((end_date.getTime() - start_date.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Group logs by habit
        const logsByHabit = habitLogs.reduce((acc, log) => {
            if (!acc[log.habit_id]) {
                acc[log.habit_id] = [];
            }
            acc[log.habit_id].push(log.completed_at);
            return acc;
        }, {} as Record<number, Date[]>);

        // Calculate analytics for each habit
        const habitAnalytics: HabitAnalytics[] = habits.map(habit => {
            const completions = logsByHabit[habit.id] || [];
            const totalCompletions = completions.length;
            const completionRate = totalDays > 0 ? (totalCompletions / totalDays) * 100 : 0;

            // Calculate streaks
            const streaks = calculateStreaks(completions, end_date);

            // Calculate weekly completions
            const weeklyMap = new Map<string, number>();
            completions.forEach(date => {
                const weekStart = getWeekStart(date);
                weeklyMap.set(weekStart, (weeklyMap.get(weekStart) || 0) + 1);
            });

            const weeklyCompletions = Array.from(weeklyMap.entries())
                .map(([week, count]) => ({ week, completions: count }))
                .sort((a, b) => a.week.localeCompare(b.week));

            // Calculate consistency score (based on completion rate and streak consistency)
            const streakBonus = Math.min(streaks.longest / totalDays * 20, 20); // Up to 20 bonus points
            const consistencyScore = Math.min(completionRate + streakBonus, 100);

            return {
                habit_id: habit.id,
                habit_name: habit.name,
                completion_rate: Math.round(completionRate * 100) / 100, // Round to 2 decimal places
                current_streak: streaks.current,
                longest_streak: streaks.longest,
                total_completions: totalCompletions,
                weekly_completions: weeklyCompletions,
                consistency_score: Math.round(consistencyScore * 100) / 100
            };
        });

        // Calculate overall analytics
        const totalHabits = habits.length;
        const activeHabits = habits.filter(h => h.is_active).length;
        const overallCompletionRate = habitAnalytics.length > 0
            ? habitAnalytics.reduce((sum, h) => sum + h.completion_rate, 0) / habitAnalytics.length
            : 0;

        return {
            total_habits: totalHabits,
            active_habits: activeHabits,
            overall_completion_rate: Math.round(overallCompletionRate * 100) / 100,
            habits: habitAnalytics
        };

    } catch (error) {
        console.error('Habit analytics calculation failed:', error);
        throw error;
    }
};