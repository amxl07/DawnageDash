import { StyleSheet, Text as NativeText } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { PhotoSlot, type SlotState } from './PhotoSlot';

const MockNativeText = NativeText;

jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));

jest.mock('@/lib/photos', () => ({
  ANGLES: [
    { key: 'front', label: 'Front', column: 'front_url' },
    { key: 'back', label: 'Back', column: 'back_url' },
    { key: 'side_left', label: 'Left', column: 'side_left_url' },
    { key: 'side_right', label: 'Right', column: 'side_right_url' },
  ],
}));

jest.mock('lucide-react-native', () => ({
  Camera: jest.requireActual('react-native').View,
  ImageIcon: jest.requireActual('react-native').View,
  RotateCcw: jest.requireActual('react-native').View,
  Trash2: jest.requireActual('react-native').View,
}));

jest.mock('@/components/ui', () => ({
  Text: ({ children, ...props }: React.ComponentProps<typeof NativeText>) => (
    <MockNativeText {...props}>{children}</MockNativeText>
  ),
}));

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { lg: 24 },
  radius: { md: 12 },
  spacing: { xs: 4 },
  useTheme: () => ({
    colors: {
      borderStrong: '#888',
      destructive: '#c00',
      elevated: '#fff',
      mutedForeground: '#555',
      onPrimary: '#fff',
      scrim: 'rgba(0,0,0,.5)',
    },
  }),
}));

jest.mock('./PoseGuide', () => ({ PoseGuide: jest.requireActual('react-native').View }));

const emptyState: SlotState = {
  url: null,
  pendingUri: null,
  uploading: false,
  error: null,
};

function renderPhotoSlot(
  state: SlotState,
  callbacks: {
    onChoose?: () => void;
    onChooseFromLibrary?: () => void;
    onRemove?: () => void;
    onRetry?: () => void;
  } = {},
  disabled = false,
) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <PhotoSlot
        angle="front"
        state={state}
        ghostUrl={null}
        showGuide
        onChoose={callbacks.onChoose ?? jest.fn()}
        onChooseFromLibrary={callbacks.onChooseFromLibrary ?? jest.fn()}
        onRemove={callbacks.onRemove ?? jest.fn()}
        onRetry={callbacks.onRetry ?? jest.fn()}
        disabled={disabled}
      />,
    );
  });

  const getByLabelText = (accessibilityLabel: string) =>
    renderer.root.find(
      (node: { props: { accessibilityLabel?: string } }) =>
        node.props.accessibilityLabel === accessibilityLabel,
    );

  return { renderer, getByLabelText };
}

describe('PhotoSlot', () => {
  it.each([
    [{ ...emptyState }, 'Front photo, empty'],
    [
      { ...emptyState, pendingUri: 'file://front.jpg' },
      'Front photo, selected and not uploaded',
    ],
    [
      { ...emptyState, pendingUri: 'file://front.jpg', uploading: true },
      'Front photo, uploading',
    ],
    [
      { ...emptyState, pendingUri: 'file://front.jpg', error: 'Upload failed' },
      'Front photo, upload failed',
    ],
    [
      { ...emptyState, url: 'https://example.com/front.jpg' },
      'Front photo, uploaded',
    ],
  ] as const)('announces the slot state', (state, label) => {
    const { getByLabelText } = renderPhotoSlot(state);

    expect(getByLabelText(label)).toBeTruthy();
  });

  it('marks an uploading thumbnail busy and disabled', () => {
    const { getByLabelText } = renderPhotoSlot({
      ...emptyState,
      pendingUri: 'file://front.jpg',
      uploading: true,
    });

    expect(getByLabelText('Front photo, uploading').props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
  });

  it('keeps a selection-validation error separate from upload failure', () => {
    const state: SlotState = {
      ...emptyState,
      pendingUri: 'file://front.jpg',
      error: 'That image is over 10MB. Pick a smaller one.',
      errorKind: 'selection',
    };
    const { renderer, getByLabelText } = renderPhotoSlot(state);

    expect(getByLabelText('Front photo, selected and not uploaded')).toBeTruthy();
    expect(
      renderer.root.findByProps({ children: 'That image is over 10MB. Pick a smaller one.' }),
    ).toBeTruthy();
    expect(
      renderer.root.findAll(
        (node: { props: { accessibilityLabel?: string } }) =>
          node.props.accessibilityLabel === 'Retry Front photo upload',
      ),
    ).toHaveLength(0);
  });

  it('retains the failed local preview and offers a visible retry action', () => {
    const onRetry = jest.fn();
    const onRemove = jest.fn();
    const { renderer, getByLabelText } = renderPhotoSlot(
      { ...emptyState, pendingUri: 'file://front.jpg', error: 'Upload failed' },
      { onRetry, onRemove },
    );

    const image = renderer.root.findByType('ExpoImage');
    expect(image.props).toMatchObject({
      source: { uri: 'file://front.jpg' },
      contentFit: 'cover',
      cachePolicy: 'memory-disk',
      recyclingKey: 'front:file://front.jpg',
      accessible: false,
    });
    expect(StyleSheet.flatten(image.props.style)).toMatchObject({ width: '100%', height: '100%' });

    const retry = getByLabelText('Retry Front photo upload');
    expect(StyleSheet.flatten(retry.props.style).minHeight).toBeGreaterThanOrEqual(44);
    act(() => retry.props.onPress());
    expect(onRetry).toHaveBeenCalledTimes(1);

    const remove = getByLabelText('Remove Front photo');
    expect(StyleSheet.flatten(remove.props.style).minHeight).toBeGreaterThanOrEqual(44);
    act(() => remove.props.onPress());
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('keeps choose, library, and remove as explicit actions with 44pt targets', () => {
    const onChoose = jest.fn();
    const onChooseFromLibrary = jest.fn();
    const onRemove = jest.fn();

    const empty = renderPhotoSlot(emptyState, { onChoose, onChooseFromLibrary });
    const thumbnail = empty.getByLabelText('Front photo, empty');
    const library = empty.getByLabelText('Choose Front photo from library');
    expect(thumbnail.props.accessibilityRole).toBe('button');
    expect(StyleSheet.flatten(library.props.style).minHeight).toBeGreaterThanOrEqual(44);
    act(() => thumbnail.props.onPress());
    act(() => library.props.onPress());
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChooseFromLibrary).toHaveBeenCalledTimes(1);

    const uploaded = renderPhotoSlot(
      { ...emptyState, url: 'https://example.com/front.jpg' },
      { onRemove },
    );
    const remove = uploaded.getByLabelText('Remove Front photo');
    expect(StyleSheet.flatten(remove.props.style).minHeight).toBeGreaterThanOrEqual(44);
    act(() => remove.props.onPress());
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('disables every slot mutation while another save operation is in flight', () => {
    const empty = renderPhotoSlot(emptyState, {}, true);
    expect(empty.getByLabelText('Front photo, empty').props.disabled).toBe(true);
    expect(empty.getByLabelText('Choose Front photo from library').props.disabled).toBe(true);

    const uploaded = renderPhotoSlot(
      { ...emptyState, url: 'https://example.com/front.jpg' },
      {},
      true,
    );
    expect(uploaded.getByLabelText('Front photo, uploaded').props.disabled).toBe(true);
    expect(uploaded.getByLabelText('Remove Front photo').props.disabled).toBe(true);

    const failed = renderPhotoSlot(
      { ...emptyState, pendingUri: 'file://front.jpg', error: 'Upload failed' },
      {},
      true,
    );
    expect(failed.getByLabelText('Retry Front photo upload').props.disabled).toBe(true);
    expect(failed.getByLabelText('Remove Front photo').props.disabled).toBe(true);
  });
});
