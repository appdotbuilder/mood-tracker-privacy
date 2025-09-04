import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { MoodEntry, Medication, Supplement, Habit } from '../../../server/src/schema';

interface AnalyticsProps {
  userId: string;
  moodEntries: MoodEntry[];
  medications: Medication[];
  supplements: Supplement[];
  habits: Habit[];
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

export function Analytics({ moodEntries, medications, supplements, habits }: AnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [filteredMoodEntries, setFilteredMoodEntries] = useState<MoodEntry[]>([]);

  useEffect(() => {
    const filterByTimeRange = () => {
      const now = new Date();
      let cutoffDate = new Date();

      switch (timeRange) {
        case '7d':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoffDate.setDate(now.getDate() - 90);
          break;
        case 'all':
          cutoffDate = new Date(0);
          break;
      }

      const filtered = moodEntries.filter(entry => 
        new Date(entry.created_at) >= cutoffDate
      );
      setFilteredMoodEntries(filtered);
    };

    filterByTimeRange();
  }, [timeRange, moodEntries]);

  const getMoodStats = () => {
    if (filteredMoodEntries.length === 0) {
      return { average: 0, highest: 0, lowest: 0, trend: 'neutral' };
    }

    const scores = filteredMoodEntries.map(entry => entry.mood_score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);

    // Calculate trend (comparing first half vs second half)
    const midPoint = Math.floor(filteredMoodEntries.length / 2);
    const firstHalf = scores.slice(0, midPoint);
    const secondHalf = scores.slice(midPoint);
    
    const firstAvg = firstHalf.length ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : average;
    const secondAvg = secondHalf.length ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : average;
    
    let trend = 'neutral';
    if (secondAvg > firstAvg + 0.5) trend = 'improving';
    else if (secondAvg < firstAvg - 0.5) trend = 'declining';

    return { average, highest, lowest, trend };
  };

  const getMoodDistribution = () => {
    const distribution = Array(10).fill(0);
    filteredMoodEntries.forEach(entry => {
      distribution[entry.mood_score - 1]++;
    });
    return distribution;
  };

  const getWeeklyMoodData = () => {
    const weekData = Array(7).fill(0).map((_, i) => ({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
      total: 0,
      count: 0,
      average: 0
    }));

    filteredMoodEntries.forEach(entry => {
      const dayIndex = new Date(entry.created_at).getDay();
      weekData[dayIndex].total += entry.mood_score;
      weekData[dayIndex].count++;
    });

    weekData.forEach(day => {
      day.average = day.count > 0 ? day.total / day.count : 0;
    });

    return weekData;
  };

  const getStreakInfo = () => {
    if (moodEntries.length === 0) return { current: 0, longest: 0 };

    const sortedEntries = [...moodEntries].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate = new Date();

    for (let i = 0; i < sortedEntries.length; i++) {
      const entryDate = new Date(sortedEntries[i].created_at);
      const daysDiff = Math.floor((lastDate.getTime() - entryDate.getTime()) / (1000 * 3600 * 24));

      if (i === 0) {
        // First entry - check if it's today or yesterday
        if (daysDiff <= 1) {
          currentStreak = 1;
          tempStreak = 1;
        }
      } else if (daysDiff === 1) {
        // Consecutive day
        tempStreak++;
        if (currentStreak > 0) currentStreak++;
      } else if (daysDiff > 1) {
        // Gap in entries
        currentStreak = 0;
        tempStreak = 1;
      }

      longestStreak = Math.max(longestStreak, tempStreak);
      lastDate = entryDate;
    }

    return { current: currentStreak, longest: longestStreak };
  };

  const stats = getMoodStats();
  const distribution = getMoodDistribution();
  const weeklyData = getWeeklyMoodData();
  const streakInfo = getStreakInfo();
  const maxDistribution = Math.max(...distribution);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600 dark:text-green-400';
      case 'declining': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">📊 Your Analytics</h2>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: '7d' as TimeRange, label: '7 Days' },
          { key: '30d' as TimeRange, label: '30 Days' },
          { key: '90d' as TimeRange, label: '90 Days' },
          { key: 'all' as TimeRange, label: 'All Time' }
        ].map(({ key, label }) => (
          <Button
            key={key}
            onClick={() => setTimeRange(key)}
            variant={timeRange === key ? 'default' : 'outline'}
            size="sm"
            className="whitespace-nowrap"
          >
            {label}
          </Button>
        ))}
      </div>

      {filteredMoodEntries.length === 0 ? (
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <CardContent className="py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-lg mb-2">No data for this period</p>
              <p className="text-sm">Log more mood entries to see analytics</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.average.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Average Mood</p>
                  <div className={`flex items-center justify-center gap-1 mt-1 text-xs ${getTrendColor(stats.trend)}`}>
                    <span>{getTrendIcon(stats.trend)}</span>
                    <span>{stats.trend}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {streakInfo.current}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Day Streak</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Longest: {streakInfo.longest} days
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mood Range */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Mood Range</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-xl font-bold text-red-500">😞 {stats.lowest}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Lowest</p>
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-2 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 dark:from-red-900 dark:via-yellow-900 dark:to-green-900 rounded-full"></div>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-green-500">😊 {stats.highest}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Highest</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mood Distribution Chart */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Mood Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {distribution.map((count, index) => {
                  const percentage = maxDistribution > 0 ? (count / maxDistribution) * 100 : 0;
                  const moodScore = index + 1;
                  const emoji = ['😭', '😢', '😞', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩'][index];
                  
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-sm w-6">{moodScore}</span>
                      <span className="text-lg">{emoji}</span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Pattern */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Weekly Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weeklyData.map((day, index) => {
                  const height = day.average > 0 ? (day.average / 10) * 100 : 0;
                  return (
                    <div key={index} className="text-center">
                      <div className="h-20 flex items-end justify-center mb-2">
                        <div 
                          className="w-8 bg-gradient-to-t from-blue-400 to-purple-500 rounded-t-md transition-all duration-500"
                          style={{ height: `${height}%` }}
                        ></div>
                      </div>
                      <p className="text-xs font-medium">{day.day}</p>
                      <p className="text-xs text-gray-500">
                        {day.average > 0 ? day.average.toFixed(1) : '-'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Overview Stats */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
        <CardHeader>
          <CardTitle className="text-lg">Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">💊 Medications</span>
                <span className="font-semibold">{medications.filter(m => m.is_active).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">🌿 Supplements</span>
                <span className="font-semibold">{supplements.filter(s => s.is_active).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">✅ Active Habits</span>
                <span className="font-semibold">{habits.filter(h => h.is_active).length}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">📝 Total Entries</span>
                <span className="font-semibold">{moodEntries.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">📅 Days Tracked</span>
                <span className="font-semibold">{new Set(moodEntries.map(e => new Date(e.created_at).toDateString())).size}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">🎯 Best Streak</span>
                <span className="font-semibold">{streakInfo.longest} days</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}