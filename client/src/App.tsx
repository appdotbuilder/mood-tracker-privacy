import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoodTracker } from '@/components/MoodTracker';
import { MedicationTracker } from '@/components/MedicationTracker';
import { SupplementTracker } from '@/components/SupplementTracker';
import { HabitTracker } from '@/components/HabitTracker';
import { Analytics } from '@/components/Analytics';
import { Settings } from '@/components/Settings';
import { trpc } from '@/utils/trpc';
// Using type-only imports
import type { MoodEntry, Medication, Supplement, Habit } from '../../server/src/schema';

function App() {
  // User ID for the application
  const userId = 'demo-user';
  
  // State for tracking user data
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all user data
  const loadUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [moodData, medicationData, supplementData, habitData] = await Promise.all([
        trpc.getMoodEntries.query({ user_id: userId }),
        trpc.getMedications.query({ user_id: userId }),
        trpc.getSupplements.query({ user_id: userId }),
        trpc.getHabits.query({ user_id: userId })
      ]);
      
      setMoodEntries(moodData);
      setMedications(medicationData);
      setSupplements(supplementData);
      setHabits(habitData);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleDataUpdate = () => {
    loadUserData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your mood data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🌟 MoodTracker
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Your private space for mental wellness
          </p>
        </header>

        {/* Main Content */}
        <Tabs defaultValue="mood" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <TabsTrigger value="mood" className="text-xs">
              😊 Mood
            </TabsTrigger>
            <TabsTrigger value="medication" className="text-xs">
              💊 Meds
            </TabsTrigger>
            <TabsTrigger value="supplements" className="text-xs">
              🌿 Supps
            </TabsTrigger>
            <TabsTrigger value="habits" className="text-xs">
              ✅ Habits
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs">
              📊 Stats
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              ⚙️ More
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mood" className="space-y-4">
            <MoodTracker 
              userId={userId}
              moodEntries={moodEntries}
              onDataUpdate={handleDataUpdate}
            />
          </TabsContent>

          <TabsContent value="medication" className="space-y-4">
            <MedicationTracker 
              userId={userId}
              medications={medications}
              onDataUpdate={handleDataUpdate}
            />
          </TabsContent>

          <TabsContent value="supplements" className="space-y-4">
            <SupplementTracker 
              userId={userId}
              supplements={supplements}
              onDataUpdate={handleDataUpdate}
            />
          </TabsContent>

          <TabsContent value="habits" className="space-y-4">
            <HabitTracker 
              userId={userId}
              habits={habits}
              onDataUpdate={handleDataUpdate}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Analytics 
              userId={userId}
              moodEntries={moodEntries}
              medications={medications}
              supplements={supplements}
              habits={habits}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Settings userId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;