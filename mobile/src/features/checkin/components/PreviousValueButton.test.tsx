import { Text as MockNativeText } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { PreviousValueButton } from './PreviousValueButton';

const mockSelectionAsync = jest.fn();

jest.mock('expo-haptics', () => ({ selectionAsync: () => mockSelectionAsync() }));
jest.mock('@/components/ui', () => ({
  Text: ({ children, ...props }: React.ComponentProps<typeof MockNativeText>) => (
    <MockNativeText {...props}>{children}</MockNativeText>
  ),
}));
jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  radius: { pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12 },
  useTheme: () => ({ colors: {
    borderStrong: '#444', elevated: '#222', mutedForeground: '#888', foreground: '#fff',
  } }),
}));

it('shows the exact prior value in a visible accessible action', () => {
  const onApply = jest.fn();
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <PreviousValueButton label="Morning weight" value={72.6} unit="kg" onApply={onApply} />,
    );
  });

  const action = renderer.root.findByProps({
    accessibilityLabel: 'Use previous Morning weight value, 72.6 kg',
  });
  expect(renderer.root.findByProps({ variant: 'bodySm', tone: 'muted' }).props.children)
    .toEqual(['Use previous · ', '72.6 kg']);
  expect(action.props.accessibilityLabel).toBe('Use previous Morning weight value, 72.6 kg');
  act(() => action.props.onPress());
  expect(onApply).toHaveBeenCalledWith(72.6);
  expect(mockSelectionAsync).toHaveBeenCalledTimes(1);
});
