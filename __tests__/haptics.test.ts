import { isIosWebFromHints } from '../src/utils/hapticsDetect';
import {
  buildHapticSwitchClipPath,
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

  test('twelve-and-six donut matches the overlay that actually ticked', () => {
    const path = buildHapticSwitchClipPath({
      center: 100,
      innerRadius: 70,
      outerRadius: 90,
      days: [1, 15],
      totalDays: 28,
    });
    expect(path.startsWith('path(evenodd, "M 100.00 100.00 m ')).toBe(true);
    expect(path).toMatch(/ a 90\.00 90\.00 0 1 1 /);
    expect(path).toMatch(/ a 70\.00 70\.00 0 1 0 /);
    const arcs = path.match(/ a /g);
    expect(arcs?.length).toBe(4);
  });

  test('period and logged marks add one outer join per day', () => {
    const days = uniqueHapticDays(4, [10]);
    const path = buildHapticSwitchClipPath({
      center: 100,
      innerRadius: 70,
      outerRadius: 90,
      days,
      totalDays: 28,
    });
    expect(path.startsWith('path(evenodd,')).toBe(true);
    expect(path.match(/ a /g)?.length).toBe(days.length * 2);
    expect(hapticDayAngle(1, 28)).toBeCloseTo(Math.PI / 28);
  });
});
