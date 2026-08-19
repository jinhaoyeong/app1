import { LUMA_VIEWPORT_CSS } from '@/web/viewportLock';

describe('iPhone dock shell CSS', () => {
  it('does not use an uncapped safe-area offset (that paints the black chunk)', () => {
    expect(LUMA_VIEWPORT_CSS).not.toContain('safe-area-inset-bottom');
  });

  it('does not size the shell with svh/dvh/lvh (those leave a slab on iPhone)', () => {
    expect(LUMA_VIEWPORT_CSS).not.toMatch(/100(s|d|l)vh/);
  });

  it('lifts the dock above the home indicator on a phone, not flush to the edge', () => {
    expect(LUMA_VIEWPORT_CSS).toContain('#luma-dock-host');
    expect(LUMA_VIEWPORT_CSS).toContain('bottom: 40px !important');
    expect(LUMA_VIEWPORT_CSS).toContain('background: transparent !important');
  });

  it('hides an empty or dismissed dock host so it cannot steal touches', () => {
    expect(LUMA_VIEWPORT_CSS).toContain('#luma-dock-host:empty');
    expect(LUMA_VIEWPORT_CSS).toContain('[data-luma-dock="off"]');
    expect(LUMA_VIEWPORT_CSS).toContain('> *:not(:last-child)');
  });
});
