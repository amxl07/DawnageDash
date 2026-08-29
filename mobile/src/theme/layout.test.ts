import { contentMaxWidth, getResponsiveMode, screenContentPadding } from './layout';

const insets = { top: 47, right: 0, bottom: 34, left: 0 };

describe('screenContentPadding', () => {
  it('adds the top safe area to full-screen archetypes', () => {
    expect(screenContentPadding('root', insets, 'ios').paddingTop).toBe(63);
    expect(screenContentPadding('child', insets, 'ios').paddingTop).toBe(63);
    expect(screenContentPadding('editor', insets, 'ios').paddingTop).toBe(63);
  });

  it('keeps sheet content local to its sheet', () => {
    expect(screenContentPadding('sheet', insets, 'ios').paddingTop).toBe(16);
  });

  it('keeps the full Dynamic Island safe-area inset', () => {
    expect(screenContentPadding('root', { ...insets, top: 59 }, 'ios').paddingTop).toBe(75);
  });
});

describe('responsive layout', () => {
  it.each([
    [320, 1, 'compact'],
    [390, 1.3, 'compact'],
    [390, 1, 'regular'],
    [768, 1, 'wide'],
  ] as const)('maps %p/%p to %p', (width, fontScale, expected) => {
    expect(getResponsiveMode(width, fontScale)).toBe(expected);
  });

  it('caps wide reading width', () => {
    expect(contentMaxWidth('wide')).toBe(720);
    expect(contentMaxWidth('regular')).toBeUndefined();
  });
});
