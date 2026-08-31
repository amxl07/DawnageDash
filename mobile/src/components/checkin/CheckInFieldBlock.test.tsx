import { StyleSheet, Text as NativeText } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { CheckInFieldBlock } from './CheckInFieldBlock';

jest.mock('lucide-react-native', () => ({ CheckCircle2: () => null }));
jest.mock('@/components/ui', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Text: ({ children, ...props }: React.ComponentProps<typeof NativeText>) => (
      <Text {...props}>{children}</Text>
    ),
  };
});
jest.mock('@/theme', () => ({
  radius: { md: 12 }, spacing: { xs: 4, sm: 8, md: 12 },
  iconSize: { sm: 16 },
  useTheme: () => ({ colors: {
    border: '#222', borderStrong: '#444', card: '#111', elevated: '#191919',
    primary: '#f04e45', primaryFill: '#511b1b', mutedForeground: '#888',
  } }),
}));

it('distinguishes unanswered, answered, and invalid without hiding children', () => {
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(
    <CheckInFieldBlock label="Energy" complete={false} testID="field-energy">
      <NativeText>scale</NativeText>
    </CheckInFieldBlock>,
  ); });
  const field = renderer.root.findAll(
    (node: { type: string; props: { testID?: string } }) => (
      node.type === 'View' && node.props.testID === 'field-energy'
    ),
  )[0];
  expect(StyleSheet.flatten(field.props.style).borderWidth).toBe(1);
  expect(field.props.accessible).toBeUndefined();

  act(() => { renderer.update(
    <CheckInFieldBlock label="Energy" complete testID="field-energy">
      <NativeText>scale</NativeText>
    </CheckInFieldBlock>,
  ); });
  expect(renderer.root.findByProps({ testID: 'field-energy-complete' })).toBeTruthy();

  act(() => { renderer.update(
    <CheckInFieldBlock label="Energy" complete error="Choose your energy level." testID="field-energy">
      <NativeText>scale</NativeText>
    </CheckInFieldBlock>,
  ); });
  expect(JSON.stringify(renderer.toJSON())).toContain('Choose your energy level.');
  expect(renderer.root.findByProps({ children: 'Choose your energy level.' }).props.accessibilityLiveRegion).toBe('polite');
});
