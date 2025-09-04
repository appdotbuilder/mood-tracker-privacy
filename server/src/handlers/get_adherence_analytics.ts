import { db } from '../db';
import { medicationsTable, supplementsTable, medicationLogsTable, supplementLogsTable } from '../db/schema';
import { type DateRangeQuery } from '../schema';
import { eq, and, gte, lte, desc, sql, SQL } from 'drizzle-orm';

// Analytics types for medication and supplement adherence
export interface AdherenceAnalytics {
    item_id: number;
    item_name: string;
    item_type: 'medication' | 'supplement';
    adherence_rate: number; // percentage
    total_expected: number; // based on frequency
    total_logged: number;
    missed_doses: number;
    streak_days: number; // current streak
    weekly_adherence: { week: string; rate: number }[];
}

export interface OverallAdherenceAnalytics {
    medication_adherence: AdherenceAnalytics[];
    supplement_adherence: AdherenceAnalytics[];
    overall_medication_rate: number;
    overall_supplement_rate: number;
}

// Helper function to parse frequency strings and get daily dose count
const parseFrequencyToDailyDoses = (frequency: string): number => {
    const freq = frequency.toLowerCase().trim();
    
    // Handle numeric frequencies like "2x daily", "3 times daily"
    const numericMatch = freq.match(/(\d+)\s*(?:x|times?)\s*(?:per\s*)?(?:day|daily)/);
    if (numericMatch) {
        return parseInt(numericMatch[1]);
    }
    
    // Handle word frequencies
    if (freq.includes('twice') || freq.includes('2') || freq === 'bid') return 2;
    if (freq.includes('three') || freq.includes('3') || freq === 'tid') return 3;
    if (freq.includes('four') || freq.includes('4') || freq === 'qid') return 4;
    if (freq.includes('daily') || freq.includes('once') || freq === 'qd') return 1;
    if (freq.includes('weekly')) return 1/7; // Convert weekly to daily equivalent
    if (freq.includes('as needed') || freq.includes('prn')) return 0; // Skip PRN medications
    
    // Default to 1 for unrecognized frequencies
    return 1;
};

// Helper function to calculate expected doses for date range
const calculateExpectedDoses = (frequency: string, startDate: Date, endDate: Date): number => {
    const dailyDoses = parseFrequencyToDailyDoses(frequency);
    if (dailyDoses === 0) return 0; // PRN medications
    
    // Calculate days inclusive of both start and end dates
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay) + 1;
    return Math.round(dailyDoses * daysDiff);
};

// Helper function to format week string (YYYY-WW format)
const getWeekString = (date: Date): string => {
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
    return `${year}-${weekNumber.toString().padStart(2, '0')}`;
};

// Helper function to calculate current streak days
const calculateStreakDays = (logs: Array<{ taken_at: Date }>, frequency: string): number => {
    if (logs.length === 0) return 0;
    
    const dailyDoses = parseFrequencyToDailyDoses(frequency);
    if (dailyDoses === 0) return 0; // PRN medications don't have streaks
    
    // Group logs by date
    const logsByDate = new Map<string, number>();
    logs.forEach(log => {
        const dateKey = log.taken_at.toISOString().split('T')[0];
        logsByDate.set(dateKey, (logsByDate.get(dateKey) || 0) + 1);
    });
    
    // Check consecutive days from today backwards
    let streakDays = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    while (true) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const dosesForDay = logsByDate.get(dateKey) || 0;
        
        // Check if this day meets the frequency requirement
        if (dosesForDay >= dailyDoses) {
            streakDays++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
        
        // Prevent infinite loop for very long streaks
        if (streakDays > 365) break;
    }
    
    return streakDays;
};

// Helper function to calculate weekly adherence
const calculateWeeklyAdherence = (
    logs: Array<{ taken_at: Date }>,
    frequency: string,
    startDate: Date,
    endDate: Date
): { week: string; rate: number }[] => {
    const dailyDoses = parseFrequencyToDailyDoses(frequency);
    if (dailyDoses === 0) return []; // PRN medications
    
    // Group logs by week
    const logsByWeek = new Map<string, number>();
    logs.forEach(log => {
        const weekKey = getWeekString(log.taken_at);
        logsByWeek.set(weekKey, (logsByWeek.get(weekKey) || 0) + 1);
    });
    
    // Generate all weeks in the date range
    const weeks: { week: string; rate: number }[] = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const weekKey = getWeekString(currentDate);
        
        // Check if we already processed this week
        if (!weeks.some(w => w.week === weekKey)) {
            // Calculate expected doses for this week
            const weekStart = new Date(currentDate);
            const weekEnd = new Date(currentDate);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            // Adjust for actual date range boundaries
            const actualStart = weekStart < startDate ? startDate : weekStart;
            const actualEnd = weekEnd > endDate ? endDate : weekEnd;
            
            const expectedDoses = calculateExpectedDoses(frequency, actualStart, actualEnd);
            const actualDoses = logsByWeek.get(weekKey) || 0;
            
            const rate = expectedDoses > 0 ? Math.round((actualDoses / expectedDoses) * 100) : 0;
            weeks.push({ week: weekKey, rate: Math.min(rate, 100) }); // Cap at 100%
        }
        
        currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return weeks.sort((a, b) => a.week.localeCompare(b.week));
};

export const getAdherenceAnalytics = async (query: DateRangeQuery): Promise<OverallAdherenceAnalytics> => {
    try {
        // Get active medications for the user
        const medications = await db.select()
            .from(medicationsTable)
            .where(
                and(
                    eq(medicationsTable.user_id, query.user_id),
                    eq(medicationsTable.is_active, true)
                )
            )
            .execute();

        // Get active supplements for the user
        const supplements = await db.select()
            .from(supplementsTable)
            .where(
                and(
                    eq(supplementsTable.user_id, query.user_id),
                    eq(supplementsTable.is_active, true)
                )
            )
            .execute();

        // Get medication logs in date range
        const medicationLogs = await db.select()
            .from(medicationLogsTable)
            .where(
                and(
                    eq(medicationLogsTable.user_id, query.user_id),
                    gte(medicationLogsTable.taken_at, query.start_date),
                    lte(medicationLogsTable.taken_at, query.end_date)
                )
            )
            .execute();

        // Get supplement logs in date range
        const supplementLogs = await db.select()
            .from(supplementLogsTable)
            .where(
                and(
                    eq(supplementLogsTable.user_id, query.user_id),
                    gte(supplementLogsTable.taken_at, query.start_date),
                    lte(supplementLogsTable.taken_at, query.end_date)
                )
            )
            .execute();

        // Calculate medication adherence analytics
        const medication_adherence: AdherenceAnalytics[] = medications.map(medication => {
            const logs = medicationLogs.filter(log => log.medication_id === medication.id);
            const total_expected = calculateExpectedDoses(medication.frequency, query.start_date, query.end_date);
            const total_logged = logs.length;
            const missed_doses = Math.max(0, total_expected - total_logged);
            const adherence_rate = total_expected > 0 ? Math.round((total_logged / total_expected) * 100) : 0;
            const streak_days = calculateStreakDays(logs, medication.frequency);
            const weekly_adherence = calculateWeeklyAdherence(logs, medication.frequency, query.start_date, query.end_date);

            return {
                item_id: medication.id,
                item_name: medication.name,
                item_type: 'medication' as const,
                adherence_rate: Math.min(adherence_rate, 100), // Cap at 100%
                total_expected,
                total_logged,
                missed_doses,
                streak_days,
                weekly_adherence
            };
        });

        // Calculate supplement adherence analytics
        const supplement_adherence: AdherenceAnalytics[] = supplements.map(supplement => {
            const logs = supplementLogs.filter(log => log.supplement_id === supplement.id);
            const total_expected = calculateExpectedDoses(supplement.frequency, query.start_date, query.end_date);
            const total_logged = logs.length;
            const missed_doses = Math.max(0, total_expected - total_logged);
            const adherence_rate = total_expected > 0 ? Math.round((total_logged / total_expected) * 100) : 0;
            const streak_days = calculateStreakDays(logs, supplement.frequency);
            const weekly_adherence = calculateWeeklyAdherence(logs, supplement.frequency, query.start_date, query.end_date);

            return {
                item_id: supplement.id,
                item_name: supplement.name,
                item_type: 'supplement' as const,
                adherence_rate: Math.min(adherence_rate, 100), // Cap at 100%
                total_expected,
                total_logged,
                missed_doses,
                streak_days,
                weekly_adherence
            };
        });

        // Calculate overall adherence rates
        const overall_medication_rate = medication_adherence.length > 0
            ? Math.round(medication_adherence.reduce((sum, med) => sum + med.adherence_rate, 0) / medication_adherence.length)
            : 0;

        const overall_supplement_rate = supplement_adherence.length > 0
            ? Math.round(supplement_adherence.reduce((sum, supp) => sum + supp.adherence_rate, 0) / supplement_adherence.length)
            : 0;

        return {
            medication_adherence,
            supplement_adherence,
            overall_medication_rate,
            overall_supplement_rate
        };
    } catch (error) {
        console.error('Adherence analytics calculation failed:', error);
        throw error;
    }
};