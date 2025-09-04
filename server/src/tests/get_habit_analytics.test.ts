import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { habitsTable, habitLogsTable } from '../db/schema';
import { type DateRangeQuery } from '../schema';
import { getHabitAnalytics } from '../handlers/get_habit_analytics';

const testQuery: DateRangeQuery = {
    user_id: 'test-user-123',
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-01-14') // 2-week period
};

// Helper function to create habit
const createTestHabit = async (name: string, isActive: boolean = true) => {
    const result = await db.insert(habitsTable)
        .values({
            user_id: testQuery.user_id,
            name,
            description: `Test habit: ${name}`,
            target_frequency: 'daily',
            is_active: isActive
        })
        .returning()
        .execute();
    return result[0];
};

// Helper function to create habit log
const createHabitLog = async (habitId: number, completedAt: Date) => {
    await db.insert(habitLogsTable)
        .values({
            habit_id: habitId,
            user_id: testQuery.user_id,
            completed_at: completedAt,
            notes: null
        })
        .execute();
};

describe('getHabitAnalytics', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return empty analytics when no habits exist', async () => {
        const result = await getHabitAnalytics(testQuery);

        expect(result.total_habits).toEqual(0);
        expect(result.active_habits).toEqual(0);
        expect(result.overall_completion_rate).toEqual(0);
        expect(result.habits).toHaveLength(0);
    });

    it('should calculate basic habit analytics with completions', async () => {
        // Create a habit
        const habit = await createTestHabit('Exercise');

        // Add some completions (5 out of 14 days)
        const completionDates = [
            new Date('2024-01-01'),
            new Date('2024-01-03'),
            new Date('2024-01-05'),
            new Date('2024-01-07'),
            new Date('2024-01-10')
        ];

        for (const date of completionDates) {
            await createHabitLog(habit.id, date);
        }

        const result = await getHabitAnalytics(testQuery);

        expect(result.total_habits).toEqual(1);
        expect(result.active_habits).toEqual(1);
        expect(result.habits).toHaveLength(1);

        const habitAnalytics = result.habits[0];
        expect(habitAnalytics.habit_id).toEqual(habit.id);
        expect(habitAnalytics.habit_name).toEqual('Exercise');
        expect(habitAnalytics.total_completions).toEqual(5);
        expect(habitAnalytics.completion_rate).toBeCloseTo(35.71, 1); // 5/14 * 100
        expect(habitAnalytics.weekly_completions).toHaveLength(2); // Spans 2 weeks
    });

    it('should calculate streaks correctly', async () => {
        const habit = await createTestHabit('Daily Reading');

        // Create a streak: Jan 10, 11, 12, 13, 14 (5-day current streak)
        // And an earlier streak: Jan 1, 2, 3 (3-day streak)
        const completionDates = [
            new Date('2024-01-01'),
            new Date('2024-01-02'),
            new Date('2024-01-03'),
            // Gap here
            new Date('2024-01-10'),
            new Date('2024-01-11'),
            new Date('2024-01-12'),
            new Date('2024-01-13'),
            new Date('2024-01-14')
        ];

        for (const date of completionDates) {
            await createHabitLog(habit.id, date);
        }

        const result = await getHabitAnalytics(testQuery);
        const habitAnalytics = result.habits[0];

        expect(habitAnalytics.current_streak).toEqual(5);
        expect(habitAnalytics.longest_streak).toEqual(5);
        expect(habitAnalytics.total_completions).toEqual(8);
    });

    it('should calculate weekly completions correctly', async () => {
        const habit = await createTestHabit('Water Intake');

        // Week 1: Dec 31 (Sunday) - Jan 6: 3 completions
        // Week 2: Jan 7 - Jan 13: 2 completions  
        // Week 3: Jan 14: 1 completion
        const completionDates = [
            new Date('2024-01-01'), // Week 1
            new Date('2024-01-03'), // Week 1
            new Date('2024-01-05'), // Week 1
            new Date('2024-01-08'), // Week 2
            new Date('2024-01-10'), // Week 2
            new Date('2024-01-14')  // Week 3
        ];

        for (const date of completionDates) {
            await createHabitLog(habit.id, date);
        }

        const result = await getHabitAnalytics(testQuery);
        const habitAnalytics = result.habits[0];

        expect(habitAnalytics.weekly_completions).toHaveLength(3);
        
        // Check that weeks are sorted chronologically
        const weeks = habitAnalytics.weekly_completions;
        expect(weeks[0].completions).toEqual(3); // First week
        expect(weeks[1].completions).toEqual(2); // Second week
        expect(weeks[2].completions).toEqual(1); // Third week
    });

    it('should handle multiple habits correctly', async () => {
        // Create multiple habits
        const habit1 = await createTestHabit('Exercise', true);
        const habit2 = await createTestHabit('Meditation', true);
        const habit3 = await createTestHabit('Journaling', false); // Inactive

        // Add completions for habit1 (high completion rate)
        for (let i = 1; i <= 10; i++) {
            await createHabitLog(habit1.id, new Date(`2024-01-${String(i).padStart(2, '0')}`));
        }

        // Add fewer completions for habit2 (low completion rate)
        await createHabitLog(habit2.id, new Date('2024-01-01'));
        await createHabitLog(habit2.id, new Date('2024-01-07'));

        // Add completions for inactive habit3
        await createHabitLog(habit3.id, new Date('2024-01-01'));

        const result = await getHabitAnalytics(testQuery);

        expect(result.total_habits).toEqual(3);
        expect(result.active_habits).toEqual(2); // Only habit1 and habit2 are active
        expect(result.habits).toHaveLength(3);

        // Check habits are sorted by name
        const habitNames = result.habits.map(h => h.habit_name);
        expect(habitNames).toEqual(['Exercise', 'Journaling', 'Meditation']);

        // Check completion rates
        const exerciseHabit = result.habits.find(h => h.habit_name === 'Exercise');
        const meditationHabit = result.habits.find(h => h.habit_name === 'Meditation');

        expect(exerciseHabit?.completion_rate).toBeCloseTo(71.43, 1); // 10/14 * 100
        expect(meditationHabit?.completion_rate).toBeCloseTo(14.29, 1); // 2/14 * 100

        // Check overall completion rate is average of all habits
        const expectedOverall = (exerciseHabit!.completion_rate + meditationHabit!.completion_rate + result.habits[1].completion_rate) / 3;
        expect(result.overall_completion_rate).toBeCloseTo(expectedOverall, 1);
    });

    it('should handle habits with no completions', async () => {
        const habit = await createTestHabit('New Habit');

        const result = await getHabitAnalytics(testQuery);
        const habitAnalytics = result.habits[0];

        expect(habitAnalytics.total_completions).toEqual(0);
        expect(habitAnalytics.completion_rate).toEqual(0);
        expect(habitAnalytics.current_streak).toEqual(0);
        expect(habitAnalytics.longest_streak).toEqual(0);
        expect(habitAnalytics.consistency_score).toEqual(0);
        expect(habitAnalytics.weekly_completions).toHaveLength(0);
    });

    it('should only include logs within date range', async () => {
        const habit = await createTestHabit('Reading');

        // Add logs before, within, and after the date range
        await createHabitLog(habit.id, new Date('2023-12-31')); // Before range
        await createHabitLog(habit.id, new Date('2024-01-01')); // Within range
        await createHabitLog(habit.id, new Date('2024-01-07')); // Within range
        await createHabitLog(habit.id, new Date('2024-01-14')); // Within range (end date)
        await createHabitLog(habit.id, new Date('2024-01-15')); // After range

        const result = await getHabitAnalytics(testQuery);
        const habitAnalytics = result.habits[0];

        expect(habitAnalytics.total_completions).toEqual(3); // Only logs within range
        expect(habitAnalytics.completion_rate).toBeCloseTo(21.43, 1); // 3/14 * 100
    });

    it('should filter by user_id correctly', async () => {
        const habit1 = await createTestHabit('User1 Habit');
        
        // Create habit for different user
        const otherUserHabit = await db.insert(habitsTable)
            .values({
                user_id: 'other-user',
                name: 'Other User Habit',
                description: 'Habit for other user',
                target_frequency: 'daily',
                is_active: true
            })
            .returning()
            .execute();

        // Add logs for both habits
        await createHabitLog(habit1.id, new Date('2024-01-01'));
        await createHabitLog(otherUserHabit[0].id, new Date('2024-01-01'));

        const result = await getHabitAnalytics(testQuery);

        expect(result.total_habits).toEqual(1); // Only user's habit
        expect(result.habits[0].habit_name).toEqual('User1 Habit');
        expect(result.habits[0].total_completions).toEqual(1);
    });

    it('should calculate consistency score with streak bonus', async () => {
        const habit = await createTestHabit('Consistent Habit');

        // Create perfect streak for entire period (14 days)
        for (let i = 1; i <= 14; i++) {
            await createHabitLog(habit.id, new Date(`2024-01-${String(i).padStart(2, '0')}`));
        }

        const result = await getHabitAnalytics(testQuery);
        const habitAnalytics = result.habits[0];

        expect(habitAnalytics.completion_rate).toEqual(100); // Perfect completion
        expect(habitAnalytics.current_streak).toEqual(14);
        expect(habitAnalytics.longest_streak).toEqual(14);
        expect(habitAnalytics.consistency_score).toEqual(100); // Should cap at 100
    });
});