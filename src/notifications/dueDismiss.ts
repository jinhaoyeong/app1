import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'luma-due-dismissed-v1:';

function key(userId: string, asOf: string): string {
  return `${PREFIX}${userId}:${asOf}`;
}

export async function loadDismissedDue(
  userId: string,
  asOf: string,
): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key(userId, asOf));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export async function dismissDue(
  userId: string,
  asOf: string,
  id: string,
): Promise<string[]> {
  const next = [...new Set([...(await loadDismissedDue(userId, asOf)), id])];
  await AsyncStorage.setItem(key(userId, asOf), JSON.stringify(next));
  return next;
}
