import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DevicePrefs } from '@/types';

const defaultDevicePrefs = (): DevicePrefs => ({
  biometricLock: false,
  biometricTimeout: '1m',
});

interface DeviceStore extends DevicePrefs {
  hydrated: boolean;
  setDeviceHydrated: (value: boolean) => void;
  updateDevicePrefs: (patch: Partial<DevicePrefs>) => void;
}

/**
 * Device-only state. This store intentionally contains no profile, cycle,
 * symptom, or other health data. It may survive sign-out because it describes
 * this installation, not the signed-in account.
 */
export const useDeviceStore = create<DeviceStore>()(
  persist(
    (set) => ({
      ...defaultDevicePrefs(),
      hydrated: false,
      setDeviceHydrated: (value) => set({ hydrated: value }),
      updateDevicePrefs: (patch) => set(patch),
    }),
    {
      name: 'luma-device-v1',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setDeviceHydrated(true);
      },
      partialize: (state) => ({
        biometricLock: state.biometricLock,
        biometricTimeout: state.biometricTimeout,
      }),
    },
  ),
);

export const getDefaultDevicePrefs = defaultDevicePrefs;
