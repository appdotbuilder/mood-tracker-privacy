import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/utils/trpc';
import type { MoodEntry, CreateMoodEntryInput } from '../../../server/src/schema';

interface MoodTrackerProps {
  userId: string;
  moodEntries: MoodEntry[];
  onDataUpdate: () => void;
}

const moodEmojis = [
  { score: 1, emoji: '😭', label: 'Terrible', color: 'bg-red-500' },
  { score: 2, emoji: '😢', label: 'Very Bad', color: 'bg-red-400' },
  { score: 3, emoji: '😞', label: 'Bad', color: 'bg-orange-500' },
  { score: 4, emoji: '😕', label: 'Poor', color: 'bg-orange-400' },
  { score: 5, emoji: '😐', label: 'Neutral', color: 'bg-yellow-500' },
  { score: 6, emoji: '🙂', label: 'Okay', color: 'bg-lime-500' },
  { score: 7, emoji: '😊', label: 'Good', color: 'bg-green-400' },
  { score: 8, emoji: '😄', label: 'Great', color: 'bg-green-500' },
  { score: 9, emoji: '😁', label: 'Amazing', color: 'bg-emerald-500' },
  { score: 10, emoji: '🤩', label: 'Incredible', color: 'bg-emerald-600' },
];

export function MoodTracker({ userId, moodEntries, onDataUpdate }: MoodTrackerProps) {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [todayEntry, setTodayEntry] = useState<MoodEntry | null>(null);

  // Check if user has already logged mood today
  useEffect(() => {
    const today = new Date().toDateString();
    const todaysMood = moodEntries.find(entry => 
      new Date(entry.created_at).toDateString() === today
    );
    setTodayEntry(todaysMood || null);
  }, [moodEntries]);

  const handleMoodSubmit = async () => {
    if (!selectedMood) return;
    
    setIsLogging(true);
    try {
      const moodData: CreateMoodEntryInput = {
        user_id: userId,
        mood_score: selectedMood,
        notes: notes.trim() || null
      };
      
      await trpc.createMoodEntry.mutate(moodData);
      setSelectedMood(null);
      setNotes('');
      onDataUpdate();
    } catch (error) {
      console.error('Failed to log mood:', error);
    } finally {
      setIsLogging(false);
    }
  };

  const getRecentMoods = () => {
    return moodEntries
      .slice(-7)
      .reverse();
  };

  const getAverageMood = () => {
    if (moodEntries.length === 0) return 0;
    const sum = moodEntries.reduce((acc, entry) => acc + entry.mood_score, 0);
    return (sum / moodEntries.length).toFixed(1);
  };

  return (
    <div className="space-y-4">
      {/* Today's Mood Entry */}
      {todayEntry ? (
        <Card className="bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">
                {moodEmojis.find(m => m.score === todayEntry.mood_score)?.emoji}
              </span>
              Today's Mood Logged!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Mood: {moodEmojis.find(m => m.score === todayEntry.mood_score)?.label} ({todayEntry.mood_score}/10)
              </p>
              {todayEntry.notes && (
                <p className="text-sm bg-white/50 dark:bg-gray-800/50 p-2 rounded italic">
                  "{todayEntry.notes}"
                </p>
              )}
              <p className="text-xs text-gray-500">
                Logged at {new Date(todayEntry.created_at).toLocaleTimeString()}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Mood Logging Interface */
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-center">How are you feeling today?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mood Scale */}
            <div className="grid grid-cols-5 gap-2">
              {moodEmojis.map((mood) => (
                <button
                  key={mood.score}
                  onClick={() => setSelectedMood(mood.score)}
                  className={`
                    aspect-square rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center p-2
                    ${selectedMood === mood.score 
                      ? `${mood.color} border-white transform scale-110 shadow-lg` 
                      : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:scale-105'
                    }
                  `}
                >
                  <span className="text-lg">{mood.emoji}</span>
                  <span className="text-xs font-medium text-center leading-tight">
                    {mood.score}
                  </span>
                </button>
              ))}
            </div>

            {/* Selected Mood Label */}
            {selectedMood && (
              <div className="text-center">
                <p className="text-lg font-semibold">
                  {moodEmojis.find(m => m.score === selectedMood)?.label}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedMood}/10
                </p>
              </div>
            )}

            {/* Notes Input */}
            <div className="space-y-2">
              <Input
                placeholder="How was your day? (optional)"
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleMoodSubmit}
              disabled={!selectedMood || isLogging}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {isLogging ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Logging...
                </div>
              ) : (
                `Log Mood ${selectedMood ? moodEmojis.find(m => m.score === selectedMood)?.emoji : ''}` 
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {moodEntries.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Entries</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {getAverageMood()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Mood</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Moods */}
      {moodEntries.length > 0 && (
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent Moods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getRecentMoods().map((entry: MoodEntry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {moodEmojis.find(m => m.score === entry.mood_score)?.emoji}
                    </span>
                    <div>
                      <p className="font-medium text-sm">
                        {moodEmojis.find(m => m.score === entry.mood_score)?.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{entry.mood_score}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}