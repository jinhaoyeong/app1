import AsyncStorage from '@react-native-async-storage/async-storage';

/** The pre-account anonymous store is read only by an explicit user action. */
export const LEGACY_STORE_KEY = 'luma-store-v1';

export async function hasLegacyLocalData(): Promise<boolean> {
  return (await AsyncStorage.getItem(LEGACY_STORE_KEY)) !== null;
}

/**
 * Permanently discards the old anonymous snapshot. No migration or upload is
 * performed by the account-first auth flow.
 */
export async function discardLegacyLocalData(): Promise<void> {
  await AsyncStorage.removeItem(LEGACY_STORE_KEY);
}
