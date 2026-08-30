import { Alert, Linking, Text as NativeText } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import * as ImagePicker from 'expo-image-picker';

import { PhotoCaptureSheet } from './PhotoCaptureSheet';

const mockUploadPhoto = jest.fn();
const mockMutateAsync = jest.fn();

jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));

jest.mock('lucide-react-native', () => ({
  Camera: jest.requireActual('react-native').View,
  ImageIcon: jest.requireActual('react-native').View,
  RotateCcw: jest.requireActual('react-native').View,
  Trash2: jest.requireActual('react-native').View,
}));

jest.mock('./PoseGuide', () => ({ PoseGuide: jest.requireActual('react-native').View }));

jest.mock('expo-image-picker', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/hooks/useProgressPhotos', () => ({
  usePhotoMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock('@/lib/photos', () => ({
  ANGLES: [
    { key: 'front', label: 'Front', column: 'front_url' },
    { key: 'back', label: 'Back', column: 'back_url' },
    { key: 'side_left', label: 'Left', column: 'side_left_url' },
    { key: 'side_right', label: 'Right', column: 'side_right_url' },
  ],
  MAX_SOURCE_BYTES: 10 * 1024 * 1024,
  uploadPhoto: (...args: unknown[]) => mockUploadPhoto(...args),
}));

jest.mock('@/components/ui', () => {
  const Native = jest.requireActual('react-native') as typeof import('react-native');
  return {
    Button: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => (
      <Native.Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
      />
    ),
    Card: ({ children }: { children: React.ReactNode }) => <Native.View>{children}</Native.View>,
    Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? <Native.View>{children}</Native.View> : null,
    SheetScrollView: ({ children }: { children: React.ReactNode }) => (
      <Native.View>{children}</Native.View>
    ),
    Text: ({ children, ...props }: React.ComponentProps<typeof Native.Text>) => (
      <Native.Text {...props}>{children}</Native.Text>
    ),
  };
});

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { lg: 24 },
  radius: { md: 12 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16 },
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

const mockImagePicker = jest.mocked(ImagePicker);

function renderSheet() {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <PhotoCaptureSheet
        visible
        onClose={jest.fn()}
        date="2026-08-30"
        existing={null}
        ghost={null}
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

describe('PhotoCaptureSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadPhoto.mockReset();
    mockMutateAsync.mockReset();
    mockMutateAsync.mockResolvedValue(undefined);
    mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      expires: 'never',
      status: ImagePicker.PermissionStatus.GRANTED,
    });
    mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file://front.jpg',
          width: 1200,
          height: 1600,
          fileName: 'front.jpg',
          fileSize: 1024,
          type: 'image',
        },
      ],
    });
  });

  it('states the exact upload and coaching-team context before the photo slots', () => {
    const { renderer } = renderSheet();
    const copy =
      'Photos upload to Dawnage only after you tap Save photos. They are used for progress review with your coaching team. You can leave any angle empty and return later.';
    const textNodes = renderer.root.findAllByType(NativeText);
    const copyIndex = textNodes.findIndex((node: { props: { children?: unknown } }) => node.props.children === copy);
    const frontIndex = textNodes.findIndex((node: { props: { children?: unknown } }) => node.props.children === 'Front');

    expect(copyIndex).toBeGreaterThanOrEqual(0);
    expect(frontIndex).toBeGreaterThan(copyIndex);
  });

  it('retains a failed local image and retries upload from the visible slot action', async () => {
    mockUploadPhoto
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ publicUrl: 'https://example.com/front.jpg', bytes: 1000 });
    const { getByLabelText } = renderSheet();

    await act(async () => {
      await getByLabelText('Choose Front photo from library').props.onPress();
    });
    await act(async () => {
      await getByLabelText('Save photos').props.onPress();
    });

    expect(getByLabelText('Front photo, upload failed')).toBeTruthy();
    await act(async () => {
      await getByLabelText('Retry Front photo upload').props.onPress();
    });

    expect(mockUploadPhoto).toHaveBeenCalledTimes(2);
    expect(mockUploadPhoto).toHaveBeenLastCalledWith(
      'file://front.jpg',
      'user-1',
      '2026-08-30',
      'Front',
      { width: 1200, height: 1600 },
    );
    expect(mockMutateAsync).toHaveBeenCalledWith({
      date: '2026-08-30',
      front_url: 'https://example.com/front.jpg',
      back_url: null,
      side_left_url: null,
      side_right_url: null,
    });
  });

  it('preserves successful concurrent uploads while retaining only the failed URI for retry', async () => {
    mockImagePicker.launchImageLibraryAsync
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: 'file://front.jpg',
            width: 1200,
            height: 1600,
            fileName: 'front.jpg',
            fileSize: 1024,
            type: 'image',
          },
        ],
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: 'file://back.jpg',
            width: 1200,
            height: 1600,
            fileName: 'back.jpg',
            fileSize: 1024,
            type: 'image',
          },
        ],
      });
    mockUploadPhoto
      .mockResolvedValueOnce({ publicUrl: 'https://example.com/front.jpg', bytes: 1000 })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ publicUrl: 'https://example.com/back.jpg', bytes: 1000 });
    const { getByLabelText } = renderSheet();

    await act(async () => {
      await getByLabelText('Choose Front photo from library').props.onPress();
      await getByLabelText('Choose Back photo from library').props.onPress();
    });
    await act(async () => {
      await getByLabelText('Save photos').props.onPress();
    });

    expect(getByLabelText('Front photo, uploaded')).toBeTruthy();
    expect(getByLabelText('Back photo, upload failed')).toBeTruthy();

    await act(async () => {
      await getByLabelText('Retry Back photo upload').props.onPress();
    });

    expect(mockUploadPhoto).toHaveBeenCalledTimes(3);
    expect(mockUploadPhoto.mock.calls.filter(([uri]) => uri === 'file://front.jpg')).toHaveLength(1);
    expect(mockMutateAsync).toHaveBeenCalledWith({
      date: '2026-08-30',
      front_url: 'https://example.com/front.jpg',
      back_url: 'https://example.com/back.jpg',
      side_left_url: null,
      side_right_url: null,
    });
  });

  it('offers cancellation and Settings after permission denial', async () => {
    mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
      expires: 'never',
      status: ImagePicker.PermissionStatus.DENIED,
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    const { getByLabelText } = renderSheet();

    await act(async () => {
      await getByLabelText('Choose Front photo from library').props.onPress();
    });

    const actions = alert.mock.calls.at(-1)?.[2];
    expect(actions?.map((action) => action.text)).toEqual(['Cancel', 'Open Settings']);
  });
});
