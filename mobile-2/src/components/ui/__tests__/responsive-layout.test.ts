import { getResponsiveLayout } from '@/components/ui/responsive-layout';

describe('getResponsiveLayout', () => {
  it('keeps compact metrics horizontal at normal text sizes', () => {
    expect(getResponsiveLayout(1)).toBe('horizontal');
  });

  it('stacks fixed metric layouts when Dynamic Type is large', () => {
    expect(getResponsiveLayout(1.5)).toBe('stacked');
    expect(getResponsiveLayout(2)).toBe('stacked');
  });
});
