import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { Supplement, CreateSupplementInput, CreateSupplementLogInput } from '../../../server/src/schema';

interface SupplementTrackerProps {
  userId: string;
  supplements: Supplement[];
  onDataUpdate: () => void;
}

export function SupplementTracker({ userId, supplements, onDataUpdate }: SupplementTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLogging, setIsLogging] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateSupplementInput>({
    user_id: userId,
    name: '',
    dosage: null,
    frequency: ''
  });

  const handleAddSupplement = async () => {
    if (!formData.name.trim() || !formData.frequency.trim()) return;

    try {
      await trpc.createSupplement.mutate(formData);
      setFormData({
        user_id: userId,
        name: '',
        dosage: null,
        frequency: ''
      });
      setShowAddForm(false);
      onDataUpdate();
    } catch (error) {
      console.error('Failed to add supplement:', error);
    }
  };

  const handleLogSupplement = async (supplementId: number) => {
    setIsLogging(supplementId);
    try {
      const logData: CreateSupplementLogInput = {
        supplement_id: supplementId,
        user_id: userId,
        taken_at: new Date(),
        notes: null
      };
      
      await trpc.createSupplementLog.mutate(logData);
      onDataUpdate();
    } catch (error) {
      console.error('Failed to log supplement:', error);
    } finally {
      setIsLogging(null);
    }
  };

  const getSupplementIcon = (name: string) => {
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('vitamin d')) return '☀️';
    if (lowercaseName.includes('vitamin c')) return '🍊';
    if (lowercaseName.includes('vitamin b')) return '🌾';
    if (lowercaseName.includes('omega') || lowercaseName.includes('fish oil')) return '🐟';
    if (lowercaseName.includes('magnesium')) return '⚡';
    if (lowercaseName.includes('calcium')) return '🦴';
    if (lowercaseName.includes('iron')) return '🩸';
    if (lowercaseName.includes('zinc')) return '⚙️';
    if (lowercaseName.includes('probiotic')) return '🦠';
    if (lowercaseName.includes('protein')) return '💪';
    return '🌿';
  };

  const getFrequencyColor = (frequency: string) => {
    const freq = frequency.toLowerCase();
    if (freq.includes('daily') || freq.includes('day')) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    if (freq.includes('twice') || freq.includes('2')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    if (freq.includes('weekly') || freq.includes('week')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const activeSupplements = supplements.filter(supp => supp.is_active);

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">🌿 Supplements</h2>
        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          size="sm"
          variant="outline"
          className="bg-white/80 dark:bg-gray-800/80"
        >
          {showAddForm ? 'Cancel' : '+ Add Supp'}
        </Button>
      </div>

      {/* Add Supplement Form */}
      {showAddForm && (
        <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-lg">Add New Supplement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Supplement name (e.g., Vitamin D3)"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateSupplementInput) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <Input
              placeholder="Dosage (e.g., 1000 IU, optional)"
              value={formData.dosage || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateSupplementInput) => ({ 
                  ...prev, 
                  dosage: e.target.value || null 
                }))
              }
            />
            <Input
              placeholder="Frequency (e.g., Daily, With meals)"
              value={formData.frequency}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateSupplementInput) => ({ ...prev, frequency: e.target.value }))
              }
              required
            />
            <Button 
              onClick={handleAddSupplement}
              className="w-full bg-green-500 hover:bg-green-600"
              disabled={!formData.name.trim() || !formData.frequency.trim()}
            >
              Add Supplement
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Supplements List */}
      {activeSupplements.length === 0 ? (
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <CardContent className="py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">🌿</div>
              <p className="text-lg mb-2">No supplements added yet</p>
              <p className="text-sm">Add your supplements to start tracking</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeSupplements.map((supplement: Supplement) => (
            <Card key={supplement.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getSupplementIcon(supplement.name)}</span>
                      <h3 className="font-semibold text-lg">{supplement.name}</h3>
                      {supplement.dosage && (
                        <Badge variant="secondary" className="text-xs">
                          {supplement.dosage}
                        </Badge>
                      )}
                    </div>
                    <Badge className={`text-xs ${getFrequencyColor(supplement.frequency)}`}>
                      {supplement.frequency}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      Added {new Date(supplement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => handleLogSupplement(supplement.id)}
                    disabled={isLogging === supplement.id}
                    className="ml-4 bg-emerald-500 hover:bg-emerald-600 text-white px-6"
                  >
                    {isLogging === supplement.id ? (
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
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {activeSupplements.length}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Active Supps</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {activeSupplements.filter(supp => supp.frequency.toLowerCase().includes('daily')).length}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Daily</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                {supplements.length - activeSupplements.length}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Inactive</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Popular Supplements Suggestions */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200 dark:border-amber-800/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                Popular Supplements
              </p>
              <div className="flex flex-wrap gap-2">
                {['☀️ Vitamin D3', '🍊 Vitamin C', '🐟 Omega-3', '⚡ Magnesium', '🦠 Probiotics'].map((supp) => (
                  <span key={supp} className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded-full border">
                    {supp}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}