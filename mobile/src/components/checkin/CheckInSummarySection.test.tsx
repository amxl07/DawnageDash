import { StyleSheet, Text as NativeText } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { CheckInSummarySection } from './CheckInSummarySection';

jest.mock('@/components/ui', () => ({
  Text: jest.requireActual<typeof import('react-native')>('react-native').Text,
}));
jest.mock('@/theme', () => ({ spacing: { xs: 4, sm: 8, md: 12 } }));

it('renders every supplied label and exact formatted value', () => {
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(
    <CheckInSummarySection title="Readiness" rows={[
      ['Energy', '7/10'], ['Stress', '3/10'], ['Weight', '74.2 kg'],
    ]} />,
  ); });
  const output = JSON.stringify(renderer.toJSON());
  expect(output).toContain('Readiness');
  expect(output).toContain('Energy');
  expect(output).toContain('7/10');
  expect(renderer.root.findByProps({ accessibilityLabel: 'Weight: 74.2 kg' }).props.accessible).toBe(true);
  expect(renderer.root.findByProps({ accessibilityLabel: 'Weight: 74.2 kg' }).props.style).toMatchObject({ flexWrap: 'wrap' });
});

it('allows long summary labels and values to shrink and wrap without truncating', () => {
  const label = 'Training readiness explanation';
  const value = 'A longer note that must remain fully readable on compact screens.';
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(
    <CheckInSummarySection title="Notes and confirmation" rows={[[label, value]]} />,
  ); });

  const labelCell = renderer.root.findByProps({ children: label });
  const valueCell = renderer.root.findByProps({ children: value });

  expect(StyleSheet.flatten(labelCell.props.style)).toMatchObject({
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '48%',
  });
  expect(StyleSheet.flatten(valueCell.props.style)).toMatchObject({
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '48%',
  });
  expect(labelCell.props.numberOfLines).toBeUndefined();
  expect(valueCell.props.numberOfLines).toBeUndefined();
});
