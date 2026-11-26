import { Text as MockNativeText } from 'react-native';
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
    .toEqual('Use 72.6 kg');
  expect(action.props.accessibilityLabel).toBe('Use previous Morning weight value, 72.6 kg');
  act(() => action.props.onPress());
  expect(onApply).toHaveBeenCalledWith(72.6);
  expect(mockSelectionAsync).toHaveBeenCalledTimes(1);
});

it('shows the source date and restores the value that preceded an explicit copy', () => {
  const onRestore = jest.fn();
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<PreviousValueButton label="Morning weight" value={72.6} currentValue={72.4} date="2026-09-14" unit="kg" onApply={jest.fn()} onRestore={onRestore} />); });
  act(() => renderer.root.findByProps({ accessibilityLabel: 'Use previous Morning weight value, 72.6 kg, from 2026-09-14' }).props.onPress());
  act(() => renderer.root.findByProps({ accessibilityLabel: 'Undo copied Morning weight' }).props.onPress());
  expect(onRestore).toHaveBeenCalledWith(72.4);
});
