/* eslint-disable @typescript-eslint/no-require-imports -- The Gorhom test double uses native primitives lazily. */
import { createRef } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Platform, StyleSheet, TextInput } from 'react-native';

import { Input } from './Input';

const mockSheetRegistration = jest.fn();
jest.mock('@gorhom/bottom-sheet', () => {
  const ReactRuntime = require('react') as typeof import('react');
  const Native = require('react-native') as typeof import('react-native');
  const BottomSheetTextInput = ReactRuntime.forwardRef<
    InstanceType<typeof Native.TextInput>,
    React.ComponentProps<typeof Native.TextInput>
  >(function MockBottomSheetTextInput({ onFocus, ...props }, ref) {
    return <Native.TextInput
      ref={ref}
      {...props}
      onFocus={(event) => {
        mockSheetRegistration(event.nativeEvent.target);
        onFocus?.(event);
      }}
    />;
  });
  return { BottomSheetTextInput };
});
jest.mock('lucide-react-native', () => ({ Eye: () => null, EyeOff: () => null }));
jest.mock('./Text', () => ({ Text: jest.requireActual('react-native').Text }));
jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { md: 20 },
  radius: { input: 14 },
  spacing: { xs: 4, sm: 8, md: 12 },
  type: { body: {} },
  useTheme: () => ({
    colors: {
      destructive: '#aa0000',
      elevated: '#ffffff',
      focusRing: '#0055ff',
      foreground: '#111111',
      borderStrong: '#777777',
      mutedForeground: '#666666',
    },
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

it('keeps ordinary inputs controlled, accessible, ref-forwarding, and at the shared minimum target size', async () => {
  const ref = createRef<TextInput>();
  const onChangeText = jest.fn();
  const view = await render(<Input ref={ref} label="Exercise name" accessibilityLabel="Editable exercise name" accessibilityHint="Use the planned movement name" placeholderTextColor="#123456" value="Cable fly" onChangeText={onChangeText} />);

  const input = view.getByLabelText('Editable exercise name');
  expect(input.props.value).toBe('Cable fly');
  expect(input.props.accessibilityHint).toBe('Use the planned movement name');
  expect(input.props.placeholderTextColor).toBe('#123456');
  expect(ref.current).toBeTruthy();
  expect(StyleSheet.flatten(input.parent?.props.style)).toMatchObject({ minHeight: 48 });

  await fireEvent.changeText(input, 'Incline fly');
  expect(onChangeText).toHaveBeenCalledWith('Incline fly');
  expect(mockSheetRegistration).not.toHaveBeenCalled();
});

it('registers sheet-aware native focus while preserving caller focus and controlled change handlers', async () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'ios');
  const ref = createRef<TextInput>();
  const onFocus = jest.fn();
  const onChangeText = jest.fn();
  try {
    const view = await render(<Input ref={ref} sheetAware label="Add an exercise" value="Row" onFocus={onFocus} onChangeText={onChangeText} />);
    const input = view.getByLabelText('Add an exercise');

    await fireEvent(input, 'focus', { nativeEvent: { target: 73 } });
    await fireEvent.changeText(input, 'Cable row');

    expect(ref.current).toBeTruthy();
    expect(mockSheetRegistration).toHaveBeenCalledWith(73);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onChangeText).toHaveBeenCalledWith('Cable row');
    expect(input.props.value).toBe('Row');
  } finally {
    platform.restore();
  }
});

it('uses the ordinary input for the sheet-aware web fallback', async () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'web');
  const onFocus = jest.fn();
  try {
    const view = await render(<Input sheetAware label="Add an exercise" value="" onFocus={onFocus} />);
    await fireEvent(view.getByLabelText('Add an exercise'), 'focus', { nativeEvent: { target: 91 } });

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(mockSheetRegistration).not.toHaveBeenCalled();
  } finally {
    platform.restore();
  }
});
