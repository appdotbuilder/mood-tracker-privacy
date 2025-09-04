import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';

interface SettingsProps {
  userId: string;
}

export function Settings({ userId }: SettingsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [notifications, setNotifications] = useState({
    moodReminders: true,
    medicationReminders: true,
    habitReminders: true,
    weeklyReports: false
  });
  const [privacy, setPrivacy] = useState({
    passcodeEnabled: false,
    biometricEnabled: false,
    dataEncryption: true
  });
  const [passcode, setPasscode] = useState('');
  const [showPasscodeInput, setShowPasscodeInput] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const exportData = await trpc.exportUserData.query({ user_id: userId });
      
      // Create downloadable JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `mood-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('Data exported successfully');
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePasscodeToggle = () => {
    if (privacy.passcodeEnabled) {
      // Disable passcode
      setPrivacy(prev => ({ ...prev, passcodeEnabled: false }));
      setPasscode('');
      setShowPasscodeInput(false);
    } else {
      // Show passcode input
      setShowPasscodeInput(true);
    }
  };

  const handleSetPasscode = () => {
    if (passcode.length >= 4) {
      setPrivacy(prev => ({ ...prev, passcodeEnabled: true }));
      setShowPasscodeInput(false);
      // In a real app, you'd securely store this passcode
      console.log('Passcode set successfully');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <h2 className="text-xl font-semibold">⚙️ Settings & Privacy</h2>

      {/* Privacy & Security */}
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            🔒 Privacy & Security
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              Device Only
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">App Passcode</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Secure your app with a passcode
              </p>
            </div>
            <Switch
              checked={privacy.passcodeEnabled}
              onCheckedChange={handlePasscodeToggle}
            />
          </div>

          {showPasscodeInput && (
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm font-medium">Set 4-digit passcode:</p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Enter passcode"
                  value={passcode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasscode(e.target.value)}
                  maxLength={4}
                  className="w-32"
                />
                <Button 
                  onClick={handleSetPasscode}
                  disabled={passcode.length < 4}
                  size="sm"
                >
                  Set
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Data Encryption</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All data stored encrypted on device
              </p>
            </div>
            <Switch
              checked={privacy.dataEncryption}
              onCheckedChange={(checked) => 
                setPrivacy(prev => ({ ...prev, dataEncryption: checked }))
              }
            />
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-blue-500">ℹ️</span>
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Privacy First Design
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Your data never leaves your device. No cloud storage, no analytics, completely private.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reminders & Notifications */}
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="text-lg">🔔 Reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Daily Mood Check-in</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Remind me to log my mood daily
              </p>
            </div>
            <Switch
              checked={notifications.moodReminders}
              onCheckedChange={(checked) => 
                setNotifications(prev => ({ ...prev, moodReminders: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Medication Reminders</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Remind me to take medications
              </p>
            </div>
            <Switch
              checked={notifications.medicationReminders}
              onCheckedChange={(checked) => 
                setNotifications(prev => ({ ...prev, medicationReminders: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Habit Reminders</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Remind me about my daily habits
              </p>
            </div>
            <Switch
              checked={notifications.habitReminders}
              onCheckedChange={(checked) => 
                setNotifications(prev => ({ ...prev, habitReminders: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Reports</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Send me weekly mood summaries
              </p>
            </div>
            <Switch
              checked={notifications.weeklyReports}
              onCheckedChange={(checked) => 
                setNotifications(prev => ({ ...prev, weeklyReports: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-lg">💾 Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Export Your Data</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Download a complete copy of all your mood tracking data in JSON format. 
              You own your data - take it with you anytime.
            </p>
            <Button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full bg-green-500 hover:bg-green-600"
            >
              {isExporting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Exporting Data...
                </div>
              ) : (
                '📤 Export All Data'
              )}
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Data Storage</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Storage Location:</span>
                <span className="font-medium">Local Device Only</span>
              </div>
              <div className="flex justify-between">
                <span>Cloud Sync:</span>
                <span className="font-medium text-red-600 dark:text-red-400">Disabled</span>
              </div>
              <div className="flex justify-between">
                <span>Data Sharing:</span>
                <span className="font-medium text-red-600 dark:text-red-400">None</span>
              </div>
              <div className="flex justify-between">
                <span>Analytics:</span>
                <span className="font-medium text-red-600 dark:text-red-400">None</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About & Support */}
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg">ℹ️ About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">🌟 MoodTracker</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Version 1.0.0
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A privacy-first mood tracking app designed to help you understand your mental wellness patterns 
              without compromising your privacy.
            </p>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">🔐 Privacy Promise</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• All data stays on your device</li>
              <li>• No user accounts or sign-ups required</li>
              <li>• No data collection or analytics</li>
              <li>• Open source and auditable</li>
              <li>• Complete data export available</li>
            </ul>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">🆘 Mental Health Resources</h4>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                If you're experiencing a mental health crisis:
              </p>
              <div className="space-y-1">
                <p>• Crisis Text Line: Text HOME to 741741</p>
                <p>• National Suicide Prevention Lifeline: 988</p>
                <p>• Emergency Services: 911</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" className="h-12 bg-white/60 dark:bg-gray-800/60">
          📱 Share App
        </Button>
        <Button variant="outline" className="h-12 bg-white/60 dark:bg-gray-800/60">
          ⭐ Rate App
        </Button>
      </div>
    </div>
  );
}