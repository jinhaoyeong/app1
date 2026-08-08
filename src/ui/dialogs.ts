import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation and notice dialogs.
 *
 * `Alert.alert` is a no-op in react-native-web, so any action placed inside an
 * Alert button silently never ran on web — including "Delete all my data".
 * These helpers fall back to the browser's own dialogs so a gated action
 * behaves the same on every platform.
 */

export async function confirmAsync(options: {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  const {
    title,
    message,
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    destructive = false,
  } = options;

  if (Platform.OS === 'web') {
    return window.confirm(message ? `${title}\n\n${message}` : title);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      {
        text: cancelLabel,
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export async function noticeAsync(options: {
  title: string;
  message?: string;
  okLabel?: string;
}): Promise<void> {
  const { title, message, okLabel = 'OK' } = options;

  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [{ text: okLabel, onPress: () => resolve() }]);
  });
}
