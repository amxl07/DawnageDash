import { TextInput } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import type { BodyMeasurement } from '@/types/db';
import { MeasurementSheet } from './MeasurementSheet';

const mockMutateAsync = jest.fn();

jest.mock('@/hooks/useMeasurements', () => ({
  useMeasurementMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock('@/lib/dates', () => ({
  localDateString: () => '2026-08-30',
  parseLocalDate: (value: string) => new Date(`${value}T00:00:00`),
}));

jest.mock('@/components/ui', () => {
  const ReactRuntime = jest.requireActual('react') as typeof import('react');
  const Native = jest.requireActual('react-native') as typeof import('react-native');
  const Input = ReactRuntime.forwardRef<
    InstanceType<typeof Native.TextInput>,
    React.ComponentProps<typeof Native.TextInput> & {
      label: string;
      error?: string;
      hint?: string;
    }
  >(({ label, error, hint: _hint, ...props }, ref) => (
    <Native.View>
      <Native.TextInput ref={ref} accessibilityLabel={label} {...props} />
      {error ? <Native.Text>{error}</Native.Text> : null}
    </Native.View>
  ));

  return {
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <Native.Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} />
    ),
    Input,
    Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? <Native.View>{children}</Native.View> : null,
    SheetScrollView: ({ children }: { children: React.ReactNode }) => (
      <Native.View>{children}</Native.View>
    ),
    StatusPill: ({ status, label }: { status: string; label?: string }) => (
      <Native.Text testID="save-status">{label ?? status}</Native.Text>
    ),
    Text: ({ children, ...props }: React.ComponentProps<typeof Native.Text>) => (
      <Native.Text {...props}>{children}</Native.Text>
    ),
  };
});

jest.mock('@/theme', () => ({
  spacing: { base: 16 },
}));

const previous: BodyMeasurement = {
  id: 'measurement-1',
  user_id: 'user-1',
  date: '2026-08-23',
  chest: 96,
  waist: 90,
  hips: 100,
  thighs: 55,
  arms: 34,
};

describe('MeasurementSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  it('persists the validated normalized values and uses them for the payoff', async () => {
    const onSaved = jest.fn();
    const onClose = jest.fn();
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <MeasurementSheet
          visible
          editing={null}
          previous={previous}
          onSaved={onSaved}
          onClose={onClose}
        />,
      );
    });

    const input = (label: string) =>
      renderer.root.find(
        (node: { type: unknown; props: { accessibilityLabel?: string } }) =>
          node.type === TextInput && node.props.accessibilityLabel === label,
      );

    act(() => input('Chest (cm)').props.onChangeText('   '));
    act(() => input('Waist (cm)').props.onChangeText(' 82.5 '));

    const [save] = renderer.root.findAll(
      (node: { props: { accessibilityLabel?: string; onPress?: unknown } }) =>
        node.props.accessibilityLabel === 'Save' && typeof node.props.onPress === 'function',
    );
    if (!save) throw new Error('Expected a Save button');
    await act(async () => {
      await save.props.onPress();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      date: '2026-08-30',
      chest: null,
      waist: 82.5,
      hips: 100,
      thighs: 55,
      arms: 34,
    });
    expect(onSaved).toHaveBeenCalledWith('Waist −7.5 cm since last time');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('retains entered values and retries only the failed save operation', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    const onSaved = jest.fn();
    const onClose = jest.fn();
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <MeasurementSheet
          visible
          editing={null}
          previous={previous}
          onSaved={onSaved}
          onClose={onClose}
        />,
      );
    });

    const waist = renderer.root.find(
      (node: { type: unknown; props: { accessibilityLabel?: string } }) =>
        node.type === TextInput && node.props.accessibilityLabel === 'Waist (cm)',
    );
    act(() => waist.props.onChangeText('82.5'));

    const press = async (label: string) => {
      await act(async () => {
        await renderer.root.findByProps({ accessibilityLabel: label }).props.onPress();
      });
    };
    await press('Save');

    expect(
      renderer.root.find(
        (node: { type: unknown; props: { accessibilityLabel?: string } }) =>
          node.type === TextInput && node.props.accessibilityLabel === 'Waist (cm)',
      ).props.value,
    ).toBe('82.5');
    expect(renderer.root.findByProps({ accessibilityLabel: 'Retry save' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'save-status' }).props.children).toBe(
      'Measurement not saved',
    );

    await press('Retry save');

    expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    expect(mockMutateAsync.mock.calls[0]).toEqual(mockMutateAsync.mock.calls[1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
