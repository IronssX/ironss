import { createContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';
type FontSize = 'small' | 'normal' | 'large';

interface Settings {
  theme: Theme;
  eyeComfort: boolean;
  reducedBrightness: boolean;
  fontSize: FontSize;
  reduceMotion: boolean;
  shortsStartMuted: boolean;
}

interface SettingsContextValue extends Settings {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const STORAGE_KEY = 'ironss:settings';
const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  eyeComfort: false,
  reducedBrightness: false,
  fontSize: 'normal',
  reduceMotion: false,
  shortsStartMuted: true,
};

export const SettingsContext = createContext<SettingsContextValue | null>(null);

function getInitialSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;
    const values = parsed as Partial<Settings>;

    return {
      theme: values.theme === 'light' ? 'light' : 'dark',
      eyeComfort: values.eyeComfort === true,
      reducedBrightness: values.reducedBrightness === true,
      fontSize: values.fontSize === 'small' || values.fontSize === 'large' ? values.fontSize : 'normal',
      reduceMotion: values.reduceMotion === true,
      shortsStartMuted: values.shortsStartMuted !== false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(getInitialSettings);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.eyeComfort = String(settings.eyeComfort);
    root.dataset.dimScreen = String(settings.reducedBrightness);
    root.dataset.reduceMotion = String(settings.reduceMotion);
    root.dataset.fontSize = settings.fontSize;
    root.style.colorScheme = settings.theme;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Preferences remain active for this session when storage is unavailable.
    }
  }, [settings]);

  const updateSetting: SettingsContextValue['updateSetting'] = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <SettingsContext.Provider value={{ ...settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}
