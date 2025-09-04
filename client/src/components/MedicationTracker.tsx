import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { Medication, CreateMedicationInput, CreateMedicationLogInput } from '../../../server/src/schema';

interface MedicationTrackerProps {
  userId: string;
  medications: Medication[];
  onDataUpdate: () => void;
}

export function MedicationTracker({ userId, medications, onDataUpdate }: MedicationTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLogging, setIsLogging] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateMedicationInput>({
    user_id: userId,
    name: '',
    dosage: null,
    frequency: ''
  });

  const handleAddMedication = async () => {
    if (!formData.name.trim() || !formData.frequency.trim()) return;

    try {
      await trpc.createMedication.mutate(formData);
      setFormData({
        user_id: userId,
        name: '',
        dosage: null,
        frequency: ''
      });
      setShowAddForm(false);
      onDataUpdate();
    } catch (error) {
      console.error('Failed to add medication:', error);
    }
  };

  const handleLogMedication = async (medicationId: number) => {
    setIsLogging(medicationId);
    try {
      const logData: CreateMedicationLogInput = {
        medication_id: medicationId,
        user_id: userId,
        taken_at: new Date(),
        notes: null
      };
      
      await trpc.createMedicationLog.mutate(logData);
      onDataUpdate();
    } catch (error) {
      console.error('Failed to log medication:', error);
    } finally {
      setIsLogging(null);
    }
  };

  const getFrequencyColor = (frequency: string) => {
    const freq = frequency.toLowerCase();
    if (freq.includes('daily') || freq.includes('day')) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    if (freq.includes('twice') || freq.includes('2')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    if (freq.includes('weekly') || freq.includes('week')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const activeMedications = medications.filter(med => med.is_active);

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">💊 Medications</h2>
        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          size="sm"
          variant="outline"
          className="bg-white/80 dark:bg-gray-800/80"
        >
          {showAddForm ? 'Cancel' : '+ Add Med'}
        </Button>
      </div>

      {/* Add Medication Form */}
      {showAddForm && (
        <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-lg">Add New Medication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Medication name"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateMedicationInput) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <Input
              placeholder="Dosage (e.g., 10mg, optional)"
              value={formData.dosage || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateMedicationInput) => ({ 
                  ...prev, 
                  dosage: e.target.value || null 
                }))
              }
            />
            <Input
              placeholder="Frequency (e.g., Daily, Twice daily)"
              value={formData.frequency}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateMedicationInput) => ({ ...prev, frequency: e.target.value }))
              }
              required
            />
            <Button 
              onClick={handleAddMedication}
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={!formData.name.trim() || !formData.frequency.trim()}
            >
              Add Medication
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Medications List */}
      {activeMedications.length === 0 ? (
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <CardContent className="py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">💊</div>
              <p className="text-lg mb-2">No medications added yet</p>
              <p className="text-sm">Add your medications to start tracking</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeMedications.map((medication: Medication) => (
            <Card key={medication.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{medication.name}</h3>
                      {medication.dosage && (
                        <Badge variant="secondary" className="text-xs">
                          {medication.dosage}
                        </Badge>
                      )}
                    </div>
                    <Badge className={`text-xs ${getFrequencyColor(medication.frequency)}`}>
                      {medication.frequency}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      Added {new Date(medication.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => handleLogMedication(medication.id)}
                    disabled={isLogging === medication.id}
                    className="ml-4 bg-green-500 hover:bg-green-600 text-white px-6"
                  >
                    {isLogging === medication.id ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                        Taking...
                      </div>
                    ) : (
                      '✓ Taken'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {activeMedications.length}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Active Meds</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {activeMedications.filter(med => med.frequency.toLowerCase().includes('daily')).length}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Daily</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {medications.length - activeMedications.length}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Inactive</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Medication Tip
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Set up reminders to help maintain consistent medication schedules. Consistency is key for effectiveness!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}