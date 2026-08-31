import { TextInput as MockTextInput, View as MockView } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { NumericEntry, normalizeNumericDraft } from './NumericEntry';

jest.mock('@/components/ui', () => ({
  Input: ({ label, children: _children, ...props }: React.ComponentProps<typeof MockTextInput> & { label: string }) => (
    <MockTextInput accessibilityLabel={label} {...props} />
  ),
}));
jest.mock('@/theme', () => ({ spacing: { xs: 4 } }));
jest.mock('./HistoryCaption', () => ({
  HistoryCaption: (props: { value: number | null }) => <MockView testID="history" {...props} />,
}));

describe('normalizeNumericDraft', () => {
  it('preserves blank as null and zero as a reported value', () => {
    expect(normalizeNumericDraft('', { min: 0, max: 20000, precision: 0 })).toBeNull();
    expect(normalizeNumericDraft('0', { min: 0, max: 20000, precision: 0 })).toBe(0);
  });

  it('normalizes decimal separators, precision, and boundaries', () => {
    expect(normalizeNumericDraft('2,555', { min: 0, max: 20, precision: 2 })).toBe(2.56);
    expect(normalizeNumericDraft('25000', { min: 0, max: 20000, precision: 0 })).toBe(20000);
  });
});

it('keeps typing local and commits the numeric value on blur', () => {
  const onChange = jest.fn();
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <NumericEntry
        label="Calories"
        value={1800}
        onChange={onChange}
        min={0}
        max={20000}
        precision={0}
        unit="kcal"
      />,
    );
  });

  const input = renderer.root.findByProps({ accessibilityLabel: 'Calories' });
  act(() => input.props.onChangeText('2150'));
  expect(onChange).not.toHaveBeenCalled();
  act(() => input.props.onBlur({}));
  expect(onChange).toHaveBeenCalledWith(2150);
});
