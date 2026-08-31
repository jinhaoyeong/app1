import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { isIosWebFromHints } from '@/utils/hapticsDetect';
import { buildHapticSwitchPathD } from '@/utils/hapticMarks';

type ImpactKind = 'light' | 'medium';
type NotifyKind = 'success';

export type HapticOrigin = { clientX: number; clientY: number };

const VIBRATE: Record<'selection' | ImpactKind | NotifyKind, number[]> = {
  selection: [12],
  light: [16],
  medium: [28],
  success: [18, 40, 18],
};

let switchLabel: HTMLLabelElement | null = null;

function iosWeb(): boolean {
  if (typeof navigator === 'undefined') return false;
  return isIosWebFromHints({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  });
}

export function hostElementFromNode(node: unknown): HTMLElement | null {
  if (!node || typeof node !== 'object') return null;
  if (typeof (node as HTMLElement).addEventListener === 'function') {
    return node as HTMLElement;
  }
  const wrapped = node as { _nativeNode?: unknown };
  return wrapped._nativeNode ? hostElementFromNode(wrapped._nativeNode) : null;
}

function styleHapticSwitch(input: HTMLInputElement) {
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.setAttribute('aria-hidden', 'true');
  input.tabIndex = -1;
  input.setAttribute('data-luma-haptic', 'true');
  Object.assign(input.style, {
    position: 'absolute',
    inset: '0px',
    width: '100%',
    height: '100%',
    margin: '0px',
    padding: '0px',
    border: '0px',
    opacity: '0.01',
    cursor: 'pointer',
    zIndex: '2',
  });
  input.style.setProperty('-webkit-tap-highlight-color', 'transparent');
}

/**
 * Park a real iOS switch over a tap/drag target. From iOS 26.5, Safari only
 * plays a Taptic pulse when the finger actually hits a switch — programmatic
 * `.click()` is ignored. On the dial, an SVG evenodd clip (relative `a`
 * commands, the form Safari already ticked) joins on each period day and
 * logged-day dot instead of at twelve and six o'clock.
 */
export function attachIosSwitchOverlay(
  host: HTMLElement | null,
  options?: {
    center?: number;
    innerRadius?: number;
    outerRadius?: number;
    days?: readonly number[];
    totalDays?: number;
    touchAction?: string;
  },
): (() => void) | undefined {
  if (!host || !iosWeb()) return;
  if (host.querySelector('[data-luma-haptic="true"]')) {
    return;
  }
  const current = window.getComputedStyle(host).position;
  if (current === 'static' || current === '') {
    host.style.position = 'relative';
  }
  host.style.overflow = 'visible';

  const input = document.createElement('input');
  styleHapticSwitch(input);
  input.style.touchAction = options?.touchAction ?? 'manipulation';

  const leftovers: HTMLElement[] = [];
  if (
    options?.center != null &&
    options.innerRadius != null &&
    options.outerRadius != null &&
    options.days &&
    options.totalDays
  ) {
    const pad = 28;
    const size = options.center * 2;
    input.style.inset = 'auto';
    input.style.left = `${-pad}px`;
    input.style.top = `${-pad}px`;
    input.style.width = `${size + pad * 2}px`;
    input.style.height = `${size + pad * 2}px`;

    const d = buildHapticSwitchPathD({
      center: options.center + pad,
      innerRadius: options.innerRadius,
      outerRadius: options.outerRadius,
      days: options.days,
      totalDays: options.totalDays,
    });
    const css = `path(evenodd, "${d}")`;
    input.style.clipPath = css;
    input.style.setProperty('-webkit-clip-path', css);
  }

  host.appendChild(input);
  leftovers.push(input);
  return () => {
    leftovers.forEach((node) => node.remove());
  };
}

/**
 * A fallback switch for iOS 17.4–26.4, where a JS `.click()` still produced
 * a pulse. Kept off-screen so older Safari can tick each day of a glide.
 */
function ensureIosSwitch(): HTMLLabelElement | null {
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }
  if (switchLabel?.isConnected) return switchLabel;

  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  Object.assign(label.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    width: '44px',
    height: '44px',
    margin: '0px',
    padding: '0px',
    border: '0px',
    opacity: '0.01',
    pointerEvents: 'none',
    zIndex: '-1',
  });

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');
  label.appendChild(input);
  document.body.appendChild(label);
  switchLabel = label;
  return label;
}

function pulseIosSwitch(at?: HapticOrigin) {
  const label = ensureIosSwitch();
  if (!label) return;
  if (at) {
    label.style.left = `${Math.round(at.clientX - 22)}px`;
    label.style.top = `${Math.round(at.clientY - 22)}px`;
  }
  label.click();
}

function webPulse(
  kind: 'selection' | ImpactKind | NotifyKind,
  at?: HapticOrigin,
) {
  if (iosWeb()) {
    pulseIosSwitch(at);
    if (kind === 'medium' || kind === 'success') {
      window.setTimeout(() => pulseIosSwitch(at), 28);
    }
    return;
  }
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  ) {
    navigator.vibrate(VIBRATE[kind]);
  }
}

/** Create the off-screen iOS switch up front so the first JS tick is not dropped. */
export function primeWebHaptics() {
  if (Platform.OS !== 'web' || !iosWeb()) return;
  ensureIosSwitch();
}

export function playSelectionHaptic(at?: HapticOrigin) {
  if (Platform.OS === 'web') {
    // iOS web taps tick from the overlay switch on the control itself.
    // Extra JS clicks would double-fire on 17.4–26.4 and do nothing from 26.5.
    if (iosWeb()) return;
    webPulse('selection', at);
    return;
  }
  Haptics.selectionAsync().catch(() => {});
}

export function playImpactHaptic(
  kind: ImpactKind = 'light',
  at?: HapticOrigin,
) {
  if (Platform.OS === 'web') {
    if (iosWeb()) return;
    webPulse(kind, at);
    return;
  }
  Haptics.impactAsync(
    kind === 'medium'
      ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Light,
  ).catch(() => {});
}

export function playNotificationHaptic(kind: NotifyKind = 'success') {
  if (Platform.OS === 'web') {
    if (iosWeb()) return;
    webPulse(kind);
    return;
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
}

/** Day-change ticks during a dial glide. Works on iOS 17.4–26.4 via JS click;
 *  from 26.5 Safari ignores it, and the overlay on grab is the remaining pulse. */
export function playGlideHaptic(strong: boolean, at?: HapticOrigin) {
  if (Platform.OS !== 'web') return;
  webPulse(strong ? 'medium' : 'selection', at);
}
