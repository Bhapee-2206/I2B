// ==============================================================================
// I2B - Settings Context
// Provides institution profile, branding, currency, and numbering settings
// ==============================================================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { InstitutionSettings } from '../types';
import { getSettings, updateSettings } from '../services/dbService';
import { DEFAULT_SETTINGS } from '../services/seedData';

interface SettingsContextType {
  settings: InstitutionSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  saveSettings: (newSettings: Partial<InstitutionSettings>) => Promise<InstitutionSettings>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<InstitutionSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const saveSettings = async (newSettings: Partial<InstitutionSettings>) => {
    const updated = await updateSettings(newSettings);
    setSettings(updated);
    return updated;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings,
        saveSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
