import {
  activeTabKey,
  isTabRoute,
  screenTopInset,
  stackBottomInset,
  TAB_SCREEN_TOP_GAP,
  WEB_SCREEN_TOP_INSET_FLOOR,
  WEB_STACK_BOTTOM_INSET,
} from '@/navigation/tabRoute';

describe('isTabRoute', () => {
  test('treats the tab group as a tab screen', () => {
    expect(isTabRoute(['(tabs)', 'calendar'], '/calendar')).toBe(true);
  });

  test('treats a bare tab path as a tab screen', () => {
    expect(isTabRoute(['today'], '/today')).toBe(true);
  });

  test('treats Today inside the tab group as a tab screen', () => {
    expect(isTabRoute(['(tabs)', 'today'], '/today')).toBe(true);
  });

  test('hides the dock on the log sheet', () => {
    expect(isTabRoute(['log'], '/log')).toBe(false);
  });

  test('hides the dock on a day page', () => {
    expect(isTabRoute(['day', '2024-08-19'], '/day/2024-08-19')).toBe(false);
  });

  test('hides the dock on settings pages', () => {
    expect(isTabRoute(['appearance'], '/appearance')).toBe(false);
    expect(isTabRoute(['health-profile'], '/health-profile')).toBe(false);
  });
});

describe('activeTabKey', () => {
  test('reads the tab from segments', () => {
    expect(activeTabKey(['(tabs)', 'insights'], '/insights')).toBe('insights');
  });

  test('falls back to today when the route is not a tab', () => {
    expect(activeTabKey(['log'], '/log')).toBe('today');
  });
});

describe('stackBottomInset', () => {
  test('keeps the native safe-area bottom', () => {
    expect(stackBottomInset(34, false)).toBe(34);
  });

  test('reserves home-bar air on web even when the inset was zeroed', () => {
    expect(stackBottomInset(0, true)).toBe(WEB_STACK_BOTTOM_INSET);
    expect(stackBottomInset(40, true)).toBe(40);
  });
});

describe('screenTopInset', () => {
  test('keeps the native status-bar inset and adds breathing room', () => {
    expect(screenTopInset(59, false)).toBe(59 + TAB_SCREEN_TOP_GAP);
  });

  test('floors web to the Dynamic Island height when the inset is zero', () => {
    expect(screenTopInset(0, true)).toBe(
      WEB_SCREEN_TOP_INSET_FLOOR + TAB_SCREEN_TOP_GAP,
    );
  });

  test('keeps a larger web inset and still adds breathing room', () => {
    expect(screenTopInset(70, true)).toBe(70 + TAB_SCREEN_TOP_GAP);
  });

  test('accepts a tighter extra gap for compact sheets', () => {
    expect(screenTopInset(0, true, 12)).toBe(WEB_SCREEN_TOP_INSET_FLOOR + 12);
  });
});
