import { useState } from 'react';
import { Pressable, Text as MockText, TextInput as MockTextInput, View as MockView } from 'react-native';
import { act, create } from 'react-test-renderer';

import { NumericEntry, normalizeNumericDraft } from './NumericEntry';
import { NumericCommitProvider, useNumericCommits } from './NumericCommitProvider';

jest.mock('@/components/ui', () => ({
  Input: ({ label, children: _children, ...props }: React.ComponentProps<typeof MockTextInput> & { label: string }) => (
    <MockTextInput accessibilityLabel={label} {...props} />
  ),
  Text: ({ children, ...props }: React.ComponentProps<typeof MockText>) => <MockText {...props}>{children}</MockText>,
}));
jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  radius: { pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12 },
  useTheme: () => ({ colors: { borderStrong: '#334155', elevated: '#1e293b', primary: '#38bdf8', primaryFill: '#0369a1' } }),
}));
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
  expect(renderer.root.findAllByType(Pressable)).toHaveLength(0);
});

it('keeps a selected bounded decimal authoritative after a partial draft is flushed and blurred', () => {
  const onChange = jest.fn();
  let flush!: NonNullable<ReturnType<typeof useNumericCommits>>['flush'];
  function Probe() {
    const [value, setValue] = useState<number | null>(7);
    flush = useNumericCommits()!.flush;
    return (
      <NumericEntry
        label="Sleep"
        value={value}
        onChange={(next) => { onChange(next); setValue(next); }}
        min={0}
        max={24}
        precision={1}
        unit="h"
        quickValues={[6, 6.5, 8]}
      />
    );
  }
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<NumericCommitProvider><Probe /></NumericCommitProvider>); });

  const input = renderer.root.findByProps({ accessibilityLabel: 'Sleep' });
  act(() => input.props.onChangeText('6.'));
  act(() => renderer.root.findByProps({ accessibilityLabel: '6.5 h' }).props.onPress());
  act(() => { expect(flush({ preserveEditing: true })).toBe(true); });
  act(() => input.props.onBlur({}));

  expect(renderer.root.findByProps({ accessibilityLabel: 'Sleep' }).props.value).toBe('6.5');
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenLastCalledWith(6.5);
});

it('keeps blank distinct from an explicitly selected zero and announces the selection', () => {
  const onChange = jest.fn();
  function Probe() {
    const [value, setValue] = useState<number | null>(null);
    return <NumericEntry label="Water" value={value} onChange={(next) => { onChange(next); setValue(next); }} min={0} max={10} precision={1} unit="L" quickValues={[0, 2.5]} />;
  }
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<Probe />); });

  expect(renderer.root.findByProps({ accessibilityLabel: 'Water' }).props.value).toBe('');
  expect(onChange).not.toHaveBeenCalled();
  act(() => renderer.root.findByProps({ accessibilityLabel: '0 L' }).props.onPress());

  expect(renderer.root.findByProps({ accessibilityLabel: 'Water' }).props.value).toBe('0');
  expect(renderer.root.findByProps({ accessibilityLabel: '0 L' }).props.accessibilityState).toEqual({ selected: true });
  expect(onChange).toHaveBeenLastCalledWith(0);
});

it('clears invalid text and its pending commit when a quick value is selected', () => {
  let hasPending!: NonNullable<ReturnType<typeof useNumericCommits>>['hasPending'];
  function Probe() {
    const [value, setValue] = useState<number | null>(7);
    const commits = useNumericCommits()!;
    hasPending = commits.hasPending;
    return <NumericEntry label="Sleep" value={value} onChange={setValue} min={0} max={24} precision={1} unit="h" quickValues={[7, 8]} />;
  }
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<NumericCommitProvider><Probe /></NumericCommitProvider>); });

  const input = renderer.root.findByProps({ accessibilityLabel: 'Sleep' });
  act(() => input.props.onChangeText('wrong'));
  act(() => input.props.onBlur({}));
  expect(renderer.root.findByProps({ accessibilityLabel: 'Sleep' }).props.error).toBe('Enter a number or clear this field.');
  expect(hasPending('Sleep')).toBe(true);

  act(() => renderer.root.findByProps({ accessibilityLabel: '8 h' }).props.onPress());
  expect(renderer.root.findByProps({ accessibilityLabel: 'Sleep' }).props.error).toBeUndefined();
  expect(hasPending('Sleep')).toBe(false);
});

it('commits focused text before Submit without depending on blur', () => {
  const onChange = jest.fn();
  let flush!: () => boolean;
  function Probe() { flush = useNumericCommits()!.flush; return <NumericEntry label="Calories" value={1800} onChange={onChange} min={0} max={20000} precision={0} />; }
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<NumericCommitProvider><Probe /></NumericCommitProvider>); });
  act(() => renderer.root.findByProps({ accessibilityLabel: 'Calories' }).props.onChangeText('2150'));
  act(() => { expect(flush()).toBe(true); });
  expect(onChange).toHaveBeenLastCalledWith(2150);
});

it('keeps invalid text editable and prevents submission of the previous number', () => {
  const onChange = jest.fn();
  let flush!: () => boolean;
  function Probe() { flush = useNumericCommits()!.flush; return <NumericEntry label="Calories" value={1800} onChange={onChange} min={0} max={20000} precision={0} />; }
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<NumericCommitProvider><Probe /></NumericCommitProvider>); });
  act(() => renderer.root.findByProps({ accessibilityLabel: 'Calories' }).props.onChangeText('wrong'));
  act(() => { expect(flush()).toBe(false); });
  expect(onChange).not.toHaveBeenCalled();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Calories' }).props.value).toBe('wrong');
});
