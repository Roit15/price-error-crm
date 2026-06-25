import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultSettings, type AppSettings } from '../domain/invoice'

type SettingsState = {
  settings: AppSettings
  updateSettings: (settings: AppSettings) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (settings) => set({ settings }),
    }),
    {
      name: 'price-error-settings',
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as Partial<SettingsState> | undefined
        const settings = state?.settings ?? defaultSettings
        const phone = settings.phone === '+91 98765 43210' || !settings.phone ? defaultSettings.phone : settings.phone

        return {
          settings: {
            ...defaultSettings,
            ...settings,
            phone,
          },
        } as SettingsState
      },
    },
  ),
)
