import { render } from '@testing-library/react-native';

import { AppSymbolFallback as AppSymbol } from './AppSymbolFallback';

jest.mock('@/theme', () => ({
  iconSize: { md: 20 },
  useTheme: () => ({ colors: { foreground: '#111111' } }),
}));

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Icon = React.forwardRef(function MockIcon(props: any, ref: any) {
    return <View ref={ref} {...props} />;
  });
  return {
    CalendarDays: Icon, Check: Icon, ChevronLeft: Icon, CircleCheck: Icon, ClipboardCheck: Icon,
    Clock3: Icon, Dumbbell: Icon, Ellipsis: Icon, House: Icon, UserRound: Icon, Utensils: Icon, X: Icon,
  };
});

describe('AppSymbol fallback', () => {
  it('exposes an accessible semantic symbol without leaking the icon implementation', async () => {
    const view = await render(<AppSymbol name="history" accessibilityLabel="Training history" testID="history" />);

    expect(view.getByLabelText('Training history')).toBeTruthy();
    expect(view.getByTestId('history')).toBeTruthy();
  });
});
