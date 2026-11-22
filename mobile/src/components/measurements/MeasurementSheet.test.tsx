import { TextInput } from 'react-native';

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

it('preserves an open draft and its comparison when measurement data refetches', async () => {
  jest.clearAllMocks();
  mockMutateAsync.mockResolvedValue(undefined);
  const onSaved = jest.fn();
  const onClose = jest.fn();
  let renderer!: ReturnType<typeof create>;
  const renderSheet = (row: BodyMeasurement, visible = true) => <MeasurementSheet visible={visible} editing={null} previous={row} onSaved={onSaved} onClose={onClose} />;
  await act(async () => { renderer = create(renderSheet(previous)); });
  const input = () => renderer.root.find((node) => node.type === TextInput && node.props.accessibilityLabel === 'Waist (cm)');
  act(() => input().props.onChangeText('82.5'));
  const refreshed = { ...previous, id: 'newer', date: '2026-08-29', waist: 85 };
  act(() => renderer.update(renderSheet(refreshed)));
  expect(input().props.value).toBe('82.5');
  await act(async () => { await renderer.root.findByProps({ accessibilityLabel: 'Save' }).props.onPress(); });
  expect(onSaved).toHaveBeenCalledWith('Waist −7.5 cm since last time');
  act(() => renderer.update(renderSheet(refreshed, false)));
  act(() => renderer.update(renderSheet(refreshed)));
  expect(input().props.value).toBe('85');
});


function deferredMeasurementSave() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

it('keeps newer edits unsaved and open when an older snapshot finishes saving', async () => {
  jest.clearAllMocks();
  const pending = deferredMeasurementSave();
  mockMutateAsync.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(undefined);
  const onSaved = jest.fn();
  const onClose = jest.fn();
  let renderer!: ReturnType<typeof create>;
  await act(async () => { renderer = create(<MeasurementSheet visible editing={null} previous={previous} onSaved={onSaved} onClose={onClose} />); });
  const waist = () => renderer.root.find((node) => node.type === TextInput && node.props.accessibilityLabel === 'Waist (cm)');
  act(() => waist().props.onChangeText('82.5'));
  let save!: Promise<void>;
  act(() => { save = renderer.root.findByProps({ accessibilityLabel: 'Save' }).props.onPress(); });
  act(() => waist().props.onChangeText('83'));
  await act(async () => { pending.resolve(); await save; });
  expect(waist().props.value).toBe('83');
  expect(onSaved).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(renderer.root.findByProps({ children: 'Earlier values saved. Your latest changes still need saving.' })).toBeTruthy();
  await act(async () => { await renderer.root.findByProps({ accessibilityLabel: 'Retry save' }).props.onPress(); });
  expect(mockMutateAsync.mock.calls.map(([payload]) => payload.waist)).toEqual([82.5, 83]);
  expect(onClose).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

it('ignores repeated keyboard and button submits synchronously while saving', async () => {
  jest.clearAllMocks();
  const pending = deferredMeasurementSave();
  mockMutateAsync.mockReturnValue(pending.promise);
  const onSaved = jest.fn();
  const onClose = jest.fn();
  let renderer!: ReturnType<typeof create>;
  await act(async () => { renderer = create(<MeasurementSheet visible editing={null} previous={previous} onSaved={onSaved} onClose={onClose} />); });
  const lastInput = renderer.root.find((node) => node.type === TextInput && node.props.accessibilityLabel === 'Arms (cm)');
  const button = renderer.root.findByProps({ accessibilityLabel: 'Save' });
  act(() => {
    lastInput.props.onSubmitEditing();
    lastInput.props.onSubmitEditing();
    void button.props.onPress();
  });
  expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve(); await pending.promise; });
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

it('blocks overlapping writes after reopening and keeps the new session draft', async () => {
  jest.clearAllMocks();
  const pending = deferredMeasurementSave();
  mockMutateAsync.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(undefined);
  const onSaved = jest.fn();
  const onClose = jest.fn();
  let renderer!: ReturnType<typeof create>;
  const sheet = (visible: boolean) => <MeasurementSheet visible={visible} editing={null} previous={previous} onSaved={onSaved} onClose={onClose} />;
  await act(async () => { renderer = create(sheet(true)); });
  let save!: Promise<void>;
  act(() => { save = renderer.root.findByProps({ accessibilityLabel: 'Save' }).props.onPress(); });
  act(() => renderer.update(sheet(false)));
  act(() => renderer.update(sheet(true)));
  const waist = () => renderer.root.find((node) => node.type === TextInput && node.props.accessibilityLabel === 'Waist (cm)');
  act(() => waist().props.onChangeText('84'));
  const lastInput = renderer.root.find((node) => node.type === TextInput && node.props.accessibilityLabel === 'Arms (cm)');
  await act(async () => {
    lastInput.props.onSubmitEditing();
    await renderer.root.findByProps({ accessibilityLabel: 'Save' }).props.onPress();
  });
  expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => { pending.resolve(); await save; });
  expect(waist().props.value).toBe('84');
  expect(onSaved).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => { await renderer.root.findByProps({ accessibilityLabel: 'Save' }).props.onPress(); });
  expect(mockMutateAsync).toHaveBeenLastCalledWith(expect.objectContaining({ waist: 84 }));
  expect(onClose).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});
