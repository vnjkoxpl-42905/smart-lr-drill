import * as React from 'react';

interface UserSettings {
  tutorEnabled: boolean;
  voiceCoachEnabled: boolean;
  showContrast: boolean;
  teachBackOnCorrect: boolean;
  sectionDebriefEnabled: boolean;
  storeFullTranscript: boolean;
}

interface UserSettingsContextType {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
}

const UserSettingsContext = React.createContext<UserSettingsContextType | undefined>(undefined);

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<UserSettings>(() => {
    // Load from localStorage
    const stored = localStorage.getItem('userSettings');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { 
          tutorEnabled: true,
          voiceCoachEnabled: true,
          showContrast: false,
          teachBackOnCorrect: false,
          sectionDebriefEnabled: false,
          storeFullTranscript: false
        };
      }
    }
    return { 
      tutorEnabled: true,
      voiceCoachEnabled: true,
      showContrast: false,
      teachBackOnCorrect: false,
      sectionDebriefEnabled: false,
      storeFullTranscript: false
    };
  });

  const updateSettings = React.useCallback((updates: Partial<UserSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      localStorage.setItem('userSettings', JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  return (
    <UserSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const context = React.useContext(UserSettingsContext);
  if (!context) {
    throw new Error('useUserSettings must be used within UserSettingsProvider');
  }
  return context;
}
