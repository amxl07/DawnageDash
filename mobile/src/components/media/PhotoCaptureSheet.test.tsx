import { Alert, Linking, Text as NativeText } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import * as ImagePicker from 'expo-image-picker';

import type { PhotoRow } from '@/hooks/useProgressPhotos';

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
    Sheet: ({
      visible,
      children,
      onClose,
      dismissible = true,
    }: {
      visible: boolean;
      children: React.ReactNode;
      onClose: () => void;
      dismissible?: boolean;
    }) =>
      visible ? (
        <Native.View
          testID="photo-capture-sheet"
          accessibilityState={{ disabled: !dismissible }}
          onTouchEnd={onClose}
        >
          {children}
        </Native.View>
      ) : null,
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

const photoAsset = (uri: string, fileSize = 1024) => ({
  uri,
  width: 1200,
  height: 1600,
  fileName: uri.split('/').at(-1) ?? 'photo.jpg',
  fileSize,
  type: 'image' as const,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function renderSheet({
  existing = null,
  onClose = jest.fn(),
}: {
  existing?: PhotoRow | null;
  onClose?: jest.Mock;
} = {}) {
  let renderer!: ReturnType<typeof create>;
  const render = (visible: boolean, row: PhotoRow | null) => (
    <PhotoCaptureSheet
      visible={visible}
      onClose={onClose}
      date="2026-08-30"
      existing={row}
      ghost={null}
    />
  );
  act(() => {
    renderer = create(render(true, existing));
  });

  const getByLabelText = (accessibilityLabel: string) =>
    renderer.root.find(
      (node: { props: { accessibilityLabel?: string } }) =>
        node.props.accessibilityLabel === accessibilityLabel,
    );

  const update = (visible: boolean, row: PhotoRow | null) => {
    act(() => renderer.update(render(visible, row)));
  };

  return { renderer, getByLabelText, onClose, update };
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
      assets: [photoAsset('file://front.jpg')],
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

  it('preserves a valid pending selection when a replacement is oversized', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { renderer, getByLabelText } = renderSheet();

    await act(async () => {
      await getByLabelText('Choose Front photo from library').props.onPress();
    });
    mockImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [photoAsset('file://oversized.jpg', 10 * 1024 * 1024 + 1)],
    });
    act(() => getByLabelText('Front photo, selected and not uploaded').props.onPress());
    const sourceActions = alert.mock.calls.find(([title]) => title === 'Front')?.[2];
    const libraryAction = sourceActions?.find((action) => action.text === 'Choose from library');
    await act(async () => {
      libraryAction?.onPress?.();
      await Promise.resolve();
    });

    expect(getByLabelText('Front photo, selected and not uploaded')).toBeTruthy();
    expect(renderer.root.findByType('ExpoImage').props.source).toEqual({ uri: 'file://front.jpg' });
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

  it('retries only the requested angle and persists successes without sending other failures', async () => {
    mockImagePicker.launchImageLibraryAsync
      .mockResolvedValueOnce({
        canceled: false,
        assets: [photoAsset('file://front.jpg')],
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [photoAsset('file://back.jpg')],
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [photoAsset('file://left.jpg')],
      });
    mockUploadPhoto
      .mockResolvedValueOnce({ publicUrl: 'https://example.com/front.jpg', bytes: 1000 })
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ publicUrl: 'https://example.com/back.jpg', bytes: 1000 });
    const onClose = jest.fn();
    const { getByLabelText } = renderSheet({ onClose });

    await act(async () => {
      await getByLabelText('Choose Front photo from library').props.onPress();
      await getByLabelText('Choose Back photo from library').props.onPress();
      await getByLabelText('Choose Left photo from library').props.onPress();
    });
    await act(async () => {
      await getByLabelText('Save photos').props.onPress();
    });

    expect(getByLabelText('Front photo, uploaded')).toBeTruthy();
    expect(getByLabelText('Back photo, upload failed')).toBeTruthy();
    expect(getByLabelText('Left photo, upload failed')).toBeTruthy();

    await act(async () => {
      await getByLabelText('Retry Back photo upload').props.onPress();
    });

    expect(mockUploadPhoto).toHaveBeenCalledTimes(4);
    expect(mockUploadPhoto.mock.calls.filter(([uri]) => uri === 'file://front.jpg')).toHaveLength(1);
    expect(mockUploadPhoto.mock.calls.filter(([uri]) => uri === 'file://back.jpg')).toHaveLength(2);
    expect(mockUploadPhoto.mock.calls.filter(([uri]) => uri === 'file://left.jpg')).toHaveLength(1);
    expect(getByLabelText('Left photo, upload failed')).toBeTruthy();
    expect(mockMutateAsync).toHaveBeenCalledWith({
      date: '2026-08-30',
      front_url: 'https://example.com/front.jpg',
      back_url: 'https://example.com/back.jpg',
      side_left_url: null,
      side_right_url: null,
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('uses a synchronous guard to ignore same-tick duplicate saves', async () => {
    const upload = deferred<{ publicUrl: string; bytes: number }>();
    mockUploadPhoto.mockReturnValue(upload.promise);
    const { getByLabelText } = renderSheet();

    await act(async () => {
      await getByLabelText('Choose Front photo from library').props.onPress();
    });

    const saveButton = getByLabelText('Save photos');
    let firstSave!: Promise<void>;
    let secondSave!: Promise<void>;
    act(() => {
      firstSave = saveButton.props.onPress();
      secondSave = saveButton.props.onPress();
    });
    expect(mockUploadPhoto).toHaveBeenCalledTimes(1);

    await act(async () => {
      upload.resolve({ publicUrl: 'https://example.com/front.jpg', bytes: 1000 });
      await Promise.all([firstSave, secondSave]);
    });
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  });

  it('locks slot mutations while the database save is pending', async () => {
    const databaseSave = deferred<void>();
    mockUploadPhoto.mockResolvedValue({
      publicUrl: 'https://example.com/front.jpg',
      bytes: 1000,
    });
    mockMutateAsync.mockReturnValue(databaseSave.promise);
    const { getByLabelText } = renderSheet();

    await act(async () => {
      await getByLabelText('Choose Front photo from library').props.onPress();
    });
    let savePromise!: Promise<void>;
    act(() => {
      savePromise = getByLabelText('Save photos').props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
    });

    const uploaded = getByLabelText('Front photo, uploaded');
    const remove = getByLabelText('Remove Front photo');
    expect(uploaded.props.disabled).toBe(true);
    expect(remove.props.disabled).toBe(true);
    act(() => remove.props.onPress());
    expect(getByLabelText('Front photo, uploaded')).toBeTruthy();

    await act(async () => {
      databaseSave.resolve();
      await savePromise;
    });
  });

  it('ignores a stale upload completion after the slot is replaced externally', async () => {
    const upload = deferred<{ publicUrl: string; bytes: number }>();
    mockUploadPhoto.mockReturnValue(upload.promise);
    const replacement: PhotoRow = {
      id: 'replacement',
      user_id: 'user-1',
      date: '2026-08-30',
      front_url: 'https://example.com/replacement.jpg',
      back_url: null,
      side_left_url: null,
      side_right_url: null,
    };
    const { renderer, getByLabelText, update } = renderSheet();

    await act(async () => {
      await getByLabelText('Choose Front photo from library').props.onPress();
    });
    let savePromise!: Promise<void>;
    act(() => {
      savePromise = getByLabelText('Save photos').props.onPress();
    });
    update(false, null);
    update(true, replacement);

    await act(async () => {
      upload.resolve({ publicUrl: 'https://example.com/stale.jpg', bytes: 1000 });
      await savePromise;
    });

    expect(renderer.root.findByType('ExpoImage').props.source).toEqual({
      uri: 'https://example.com/replacement.jpg',
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('ignores a stale upload completion after the pending selection is discarded', async () => {
    const upload = deferred<{ publicUrl: string; bytes: number }>();
    mockUploadPhoto.mockReturnValue(upload.promise);
    const { getByLabelText, update } = renderSheet();

    await act(async () => {
      await getByLabelText('Choose Front photo from library').props.onPress();
    });
    let savePromise!: Promise<void>;
    act(() => {
      savePromise = getByLabelText('Save photos').props.onPress();
    });
    update(false, null);
    update(true, null);

    await act(async () => {
      upload.resolve({ publicUrl: 'https://example.com/stale.jpg', bytes: 1000 });
      await savePromise;
    });

    expect(getByLabelText('Front photo, empty')).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('does not persist an upload that completes after the sheet unmounts', async () => {
    const upload = deferred<{ publicUrl: string; bytes: number }>();
    mockUploadPhoto.mockReturnValue(upload.promise);
    const { renderer, getByLabelText } = renderSheet();

    await act(async () => {
      await getByLabelText('Choose Front photo from library').props.onPress();
    });
    let savePromise!: Promise<void>;
    act(() => {
      savePromise = getByLabelText('Save photos').props.onPress();
    });
    act(() => renderer.unmount());

    await act(async () => {
      upload.resolve({ publicUrl: 'https://example.com/stale.jpg', bytes: 1000 });
      await savePromise;
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('allows explicit discard when no save operation is in flight', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onClose = jest.fn();
    const { renderer, getByLabelText } = renderSheet({ onClose });

    await act(async () => {
      await getByLabelText('Choose Front photo from library').props.onPress();
    });
    act(() => renderer.root.findByProps({ testID: 'photo-capture-sheet' }).props.onTouchEnd());
    const discard = alert.mock.calls
      .find(([title]) => title === 'Discard photo changes?')?.[2]
      ?.find((action) => action.text === 'Discard');
    act(() => discard?.onPress?.());

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('blocks every dismissal path while database persistence is in flight', async () => {
    const databaseSave = deferred<void>();
    mockUploadPhoto.mockResolvedValue({
      publicUrl: 'https://example.com/front.jpg',
      bytes: 1000,
    });
    mockMutateAsync.mockReturnValue(databaseSave.promise);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onClose = jest.fn();
    const { renderer, getByLabelText } = renderSheet({ onClose });

    await act(async () => {
      await getByLabelText('Choose Front photo from library').props.onPress();
    });
    let savePromise!: Promise<void>;
    act(() => {
      savePromise = getByLabelText('Save photos').props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);

    const sheet = renderer.root.findByProps({ testID: 'photo-capture-sheet' });
    expect(sheet.props.accessibilityState).toEqual({ disabled: true });
    act(() => sheet.props.onTouchEnd());

    const savingAlert = alert.mock.calls.at(-1);
    expect(savingAlert?.[0]).toBe('Saving photos');
    expect(savingAlert?.[1]).toBe('Please wait for saving to finish.');
    expect(savingAlert?.[2]?.map((action) => action.text)).toEqual(['OK']);
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      databaseSave.resolve();
      await savePromise;
    });
    expect(onClose).toHaveBeenCalledTimes(1);
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
