import { isIosWebFromHints } from '../src/utils/hapticsDetect';
import {
  buildHapticSwitchClipPath,
  buildHapticSwitchPathD,
  hapticDayAngle,
  uniqueHapticDays,
} from '../src/utils/hapticMarks';

describe('iOS home-screen web haptic detection', () => {
  test('treats iPhone and iPad Safari as iOS web', () => {
    expect(
      isIosWebFromHints({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
      }),
    ).toBe(true);
    expect(
      isIosWebFromHints({
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      }),
    ).toBe(true);
  });

  test('treats desktop-UA iPadOS as iOS web', () => {
    expect(
      isIosWebFromHints({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  test('does not treat Android or desktop as iOS web', () => {
    expect(
      isIosWebFromHints({
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
      }),
    ).toBe(false);
    expect(
      isIosWebFromHints({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      }),
    ).toBe(false);
  });
});

describe('dial haptic marks', () => {
  test('ticks period days and logged-day dots, once each', () => {
    expect(uniqueHapticDays(5, [3, 12, 18, 12])).toEqual([
      1, 2, 3, 4, 5, 12, 18,
    ]);
  });

  test('clip path uses relative evenodd arcs that join on each mark', () => {
    const days = uniqueHapticDays(4, [10]);
    const d = buildHapticSwitchPathD({
      center: 100,
      innerRadius: 70,
      outerRadius: 90,
      days,
      totalDays: 28,
    });
    expect(d.startsWith('M ')).toBe(true);
    expect(d).toMatch(/ a /);
    expect(d).not.toMatch(/ A /);
    expect(d.match(/ a /g)?.length).toBe(days.length * 2);
    expect(
      buildHapticSwitchClipPath({
        center: 100,
        innerRadius: 70,
        outerRadius: 90,
        days,
        totalDays: 28,
      }).startsWith('path(evenodd,'),
    ).toBe(true);
    expect(hapticDayAngle(1, 28)).toBeCloseTo(Math.PI / 28);
  });

  test('does not put a join at twelve o’clock unless that day is a mark', () => {
    const d = buildHapticSwitchPathD({
      center: 100,
      innerRadius: 70,
      outerRadius: 90,
      days: [1, 2, 3],
      totalDays: 28,
    });
    // Twelve o'clock on this ring is (100, 10). Day 1 sits a half-day later.
    expect(d.startsWith('M 100.00 10.00')).toBe(false);
  });
});
