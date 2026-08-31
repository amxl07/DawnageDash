import { Text as NativeText } from 'react-native';
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
