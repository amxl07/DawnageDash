import { getTabScreenTopInset } from '@/components/ui/tab-screen-boundary';

describe('getTabScreenTopInset', () => {
  it('applies the top safe-area inset to Android native tabs', () => {
    expect(getTabScreenTopInset('android', 31)).toBe(31);
  });

  it('leaves iOS inset handling to automatic scroll insets', () => {
    expect(getTabScreenTopInset('ios', 31)).toBe(0);
  });
});
