import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { Habit, CreateHabitInput, CreateHabitLogInput } from '../../../server/src/schema';

interface HabitTrackerProps {
  userId: string;
  habits: Habit[];
  onDataUpdate: () => void;
}

export function HabitTracker({ userId, habits, onDataUpdate }: HabitTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLogging, setIsLogging] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateHabitInput>({
    user_id: userId,
    name: '',
    description: null,
    target_frequency: 'daily'
  });

  const handleAddHabit = async () => {
    if (!formData.name.trim()) return;

    try {
      await trpc.createHabit.mutate(formData);
      setFormData({
        user_id: userId,
        name: '',
        description: null,
        target_frequency: 'daily'
      });
      setShowAddForm(false);
      onDataUpdate();
    } catch (error) {
      console.error('Failed to add habit:', error);
    }
  };

  const handleLogHabit = async (habitId: number) => {
    setIsLogging(habitId);
    try {
      const logData: CreateHabitLogInput = {
        habit_id: habitId,
        user_id: userId,
        completed_at: new Date(),
        notes: null
      };
      
      await trpc.createHabitLog.mutate(logData);
      onDataUpdate();
    } catch (error) {
      console.error('Failed to log habit:', error);
    } finally {
      setIsLogging(null);
    }
  };

  const getHabitIcon = (name: string) => {
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('exercise') || lowercaseName.includes('workout') || lowercaseName.includes('gym')) return '💪';
    if (lowercaseName.includes('water') || lowercaseName.includes('drink')) return '💧';
    if (lowercaseName.includes('meditat') || lowercaseName.includes('mindful')) return '🧘';
    if (lowercaseName.includes('read') || lowercaseName.includes('book')) return '📚';
    if (lowercaseName.includes('walk') || lowercaseName.includes('step')) return '🚶';
    if (lowercaseName.includes('sleep') || lowercaseName.includes('rest')) return '😴';
    if (lowercaseName.includes('journal') || lowercaseName.includes('write')) return '📝';
    if (lowercaseName.includes('stretch') || lowercaseName.includes('yoga')) return '🧘‍♀️';
    if (lowercaseName.includes('vitamin') || lowercaseName.includes('supplement')) return '💊';
    if (lowercaseName.includes('clean') || lowercaseName.includes('tidy')) return '🧹';
    if (lowercaseName.includes('cook') || lowercaseName.includes('meal')) return '🍳';
    if (lowercaseName.includes('grateful') || lowercaseName.includes('thanks')) return '🙏';
    return '✅';
  };

  const getFrequencyColor = (frequency: string) => {
    const freq = frequency.toLowerCase();
    if (freq.includes('daily')) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    if (freq.includes('weekly')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    if (freq.includes('monthly')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const activeHabits = habits.filter(habit => habit.is_active);

  const popularHabits = [
    { name: '💧 Drink 8 glasses of water', freq: 'daily' },
    { name: '🚶 Take 10,000 steps', freq: 'daily' },
    { name: '🧘 Meditate for 10 minutes', freq: 'daily' },
    { name: '📚 Read for 30 minutes', freq: 'daily' },
    { name: '📝 Write in journal', freq: 'daily' },
    { name: '💪 Exercise', freq: 'daily' }
  ];

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">✅ Habits</h2>
        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          size="sm"
          variant="outline"
          className="bg-white/80 dark:bg-gray-800/80"
        >
          {showAddForm ? 'Cancel' : '+ Add Habit'}
        </Button>
      </div>

      {/* Add Habit Form */}
      {showAddForm && (
        <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="text-lg">Add New Habit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Habit name (e.g., Drink 8 glasses of water)"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateHabitInput) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <Input
              placeholder="Description (optional)"
              value={formData.description || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateHabitInput) => ({ 
                  ...prev, 
                  description: e.target.value || null 
                }))
              }
            />
            <select
              value={formData.target_frequency}
              onChange={(e) =>
                setFormData((prev: CreateHabitInput) => ({ ...prev, target_frequency: e.target.value }))
              }
              className="w-full h-9 px-3 py-1 text-sm bg-transparent border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="as needed">As needed</option>
            </select>
            <Button 
              onClick={handleAddHabit}
              className="w-full bg-purple-500 hover:bg-purple-600"
              disabled={!formData.name.trim()}
            >
              Add Habit
            </Button>

            {/* Quick Add Suggestions */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Quick Add Popular Habits:</p>
              <div className="grid grid-cols-1 gap-2">
                {popularHabits.slice(0, 3).map((habit, index) => (
                  <button
                    key={index}
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      name: habit.name,
                      target_frequency: habit.freq 
                    }))}
                    className="text-left p-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {habit.name}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Habits List */}
      {activeHabits.length === 0 ? (
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <CardContent className="py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-lg mb-2">No habits added yet</p>
              <p className="text-sm">Start building positive habits today</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeHabits.map((habit: Habit) => (
            <Card key={habit.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getHabitIcon(habit.name)}</span>
                      <h3 className="font-semibold text-lg">{habit.name}</h3>
                    </div>
                    {habit.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {habit.description}
                      </p>
                    )}
                    <Badge className={`text-xs ${getFrequencyColor(habit.target_frequency)}`}>
                      {habit.target_frequency}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      Started {new Date(habit.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => handleLogHabit(habit.id)}
                    disabled={isLogging === habit.id}
                    className="ml-4 bg-purple-500 hover:bg-purple-600 text-white px-6"
                  >
                    {isLogging === habit.id ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                        Logging...
                      </div>
                    ) : (
                      '✓ Done'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {activeHabits.length}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Active Habits</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                {activeHabits.filter(habit => habit.target_frequency === 'daily').length}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Daily Goals</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {habits.length - activeHabits.length}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Motivation Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 border-blue-200 dark:border-blue-800/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                Habit Building Tip
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Start small! It takes an average of 66 days to form a new habit. Focus on consistency over perfection.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}