import { LUMA_VIEWPORT_CSS } from '@/web/viewportLock';

describe('iPhone dock shell CSS', () => {
  it('does not lift the dock by safe-area inset (that paints the black chunk)', () => {
    expect(LUMA_VIEWPORT_CSS).not.toContain('safe-area-inset-bottom');
  });

  it('does not size the shell with svh/dvh/lvh (those leave a slab on iPhone)', () => {
    expect(LUMA_VIEWPORT_CSS).not.toMatch(/100(s|d|l)vh/);
  });

  it('pins the dock to the canvas bottom', () => {
    expect(LUMA_VIEWPORT_CSS).toContain('#luma-dock-host');
    expect(LUMA_VIEWPORT_CSS).toContain('bottom: 8px !important');
  });
});
