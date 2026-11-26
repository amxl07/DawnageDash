import { PostgrestClient } from '@supabase/postgrest-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { Alert, Linking, Text as NativeText } from 'react-native';

import { act, create } from 'react-test-renderer';

import * as ImagePicker from 'expo-image-picker';

import type { PhotoRow } from '@/hooks/useProgressPhotos';

import { PhotoCaptureSheet } from './PhotoCaptureSheet';

jest.mock('@/hooks/usePrivatePhotoUrl', () => ({ usePrivatePhotoUrl: (reference: string) => ({ url: mockSignedDisplay ?? reference, loading: false, refresh: jest.fn() }) }));

let mockUserId = 'user-1';
let mockSignedDisplay: string | null = null;
const mockUploadPhoto = jest.fn();
const mockMutateAsync = jest.fn();
let mockPhotoDatabase = new PostgrestClient('https://fixture.supabase.co/rest/v1');

jest.mock('@/lib/env', () => ({ supabaseUrl: 'https://fixture.supabase.co' }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => mockPhotoDatabase.from(table) } }));

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
  useAuth: () => ({ user: { id: mockUserId } }),
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
    StatusPill: ({ status, label }: { status: string; label?: string }) => (
      <Native.Text testID="save-status">{label ?? status}</Native.Text>
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
  useMotion: () => ({ reduced: false, duration: { micro: 160 } }),
  useTheme: () => ({
    colors: {
      borderStrong: '#888',
      destructive: '#c00',
      elevated: '#fff',
      mutedForeground: '#555',
      onPrimary: '#fff',
      pressed: '#eee',
      primaryPressed: '#900',
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
    mockUserId = 'user-1';
    mockSignedDisplay = null;
    jest.clearAllMocks();
    mockUploadPhoto.mockReset();
    mockMutateAsync.mockReset();
    mockImagePicker.requestMediaLibraryPermissionsAsync.mockReset();
    mockImagePicker.launchImageLibraryAsync.mockReset();
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
      'Photos upload when you tap Save photos or retry an upload, and are shared with your coaching team for progress review. Any angles are optional.';
    const textNodes = renderer.root.findAllByType(NativeText);
    const copyIndex = textNodes.findIndex((node: { props: { children?: unknown } }) => node.props.children === copy);
    const frontIndex = textNodes.findIndex((node: { props: { children?: unknown } }) => node.props.children === 'Front');

    expect(copyIndex).toBeGreaterThanOrEqual(0);
    expect(frontIndex).toBeGreaterThan(copyIndex);
  });

  it('retains a failed local image and retries upload from the visible slot action', async () => {
    mockUploadPhoto
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ objectPath: 'user-1/2026-08-30/front_123.jpg', bytes: 1000 });
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
      front_url: 'user-1/2026-08-30/front_123.jpg',
      back_url: null,
      side_left_url: null,
      side_right_url: null,
    });
  });

  it('retains uploaded slots and retries only database persistence after a save failure', async () => {
    mockUploadPhoto.mockResolvedValue({
      objectPath: 'user-1/2026-08-30/front_123.jpg',
      bytes: 1000,
    });
    mockMutateAsync.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    const onClose = jest.fn();
    const { getByLabelText, renderer } = renderSheet({ onClose });

    await act(async () => {
      await getByLabelText('Choose Front photo from library').props.onPress();
    });
    await act(async () => {
      await getByLabelText('Save photos').props.onPress();
    });

    expect(getByLabelText('Front photo, uploaded')).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Retry save' })).toBeTruthy();
    expect(renderer.root.findAllByType(NativeText).some((node) => node.props.children === "Couldn't save. Check your connection and try again.")).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      await getByLabelText('Retry save').props.onPress();
    });

    expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    expect(mockMutateAsync.mock.calls[0]).toEqual(mockMutateAsync.mock.calls[1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('retains exact uploaded references after zero-row acknowledgement and retries without uploading again', async () => {
    mockUserId = '11111111-1111-4111-8111-111111111111';
    const id = '22222222-2222-4222-8222-222222222222';
    const reference = `${mockUserId}/2026-08-30/front_123.jpg`;
    const writes: unknown[] = [];
    mockPhotoDatabase = new PostgrestClient('https://fixture.supabase.co/rest/v1', {
      fetch: async (_input, init) => {
        if (init?.method === 'GET') return new Response(JSON.stringify([{ id }]), { status: 200 });
        writes.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify(writes.length === 1 ? [] : { id, user_id: mockUserId }), { status: 200 });
      },
    });
    const { usePhotoMutation: useActualPhotoMutation } = jest.requireActual<typeof import('@/hooks/useProgressPhotos')>('@/hooks/useProgressPhotos');
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } });
    let persistence!: ReturnType<typeof useActualPhotoMutation>;
    function MutationHarness() { persistence = useActualPhotoMutation(); return null; }
    let harness!: ReturnType<typeof create>;
    await act(async () => { harness = create(<QueryClientProvider client={client}><MutationHarness /></QueryClientProvider>); });
    mockMutateAsync.mockImplementation((payload) => persistence.mutateAsync(payload));
    mockUploadPhoto.mockResolvedValue({ objectPath: reference, bytes: 1000 });
    const { getByLabelText, onClose, renderer } = renderSheet();
    await act(async () => { await getByLabelText('Choose Front photo from library').props.onPress(); });
    await act(async () => { await getByLabelText('Save photos').props.onPress(); });
    expect(onClose).not.toHaveBeenCalled();
    expect(getByLabelText('Front photo, uploaded')).toBeTruthy();
    expect(getByLabelText('Retry save')).toBeTruthy();
    await act(async () => { await getByLabelText('Retry save').props.onPress(); });
    expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
    expect(writes).toEqual([
      { date: '2026-08-30', front_url: reference, back_url: null, side_left_url: null, side_right_url: null, user_id: mockUserId },
      { date: '2026-08-30', front_url: reference, back_url: null, side_left_url: null, side_right_url: null, user_id: mockUserId },
    ]);
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => { renderer.unmount(); harness.unmount(); });
    client.clear();
  });

  it('retries a failed persistence snapshot without re-uploading unrelated failed slots', async () => {
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
      .mockRejectedValueOnce(new Error('front offline'))
      .mockRejectedValueOnce(new Error('back offline'))
      .mockRejectedValueOnce(new Error('left offline'))
      .mockResolvedValueOnce({ objectPath: 'user-1/2026-08-30/front_123.jpg', bytes: 1000 });
    const persistenceRetry = deferred<void>();
    mockMutateAsync
      .mockRejectedValueOnce(new Error('database offline'))
      .mockReturnValueOnce(persistenceRetry.promise);
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
    await act(async () => {
      await getByLabelText('Retry Front photo upload').props.onPress();
    });

    expect(getByLabelText('Front photo, uploaded')).toBeTruthy();
    expect(getByLabelText('Back photo, upload failed')).toBeTruthy();
    expect(getByLabelText('Left photo, upload failed')).toBeTruthy();
    expect(getByLabelText('Retry save')).toBeTruthy();
    expect(mockUploadPhoto).toHaveBeenCalledTimes(4);
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);

    let retryPromise!: Promise<void>;
    act(() => {
      retryPromise = getByLabelText('Retry save').props.onPress();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockUploadPhoto).toHaveBeenCalledTimes(4);
    expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    expect(mockMutateAsync.mock.calls[1]).toEqual(mockMutateAsync.mock.calls[0]);

    await act(async () => {
      persistenceRetry.resolve();
      await retryPromise;
    });

    expect(getByLabelText('Back photo, upload failed')).toBeTruthy();
    expect(getByLabelText('Left photo, upload failed')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
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
    expect(renderer.root.findByType(ExpoImage).props.source).toEqual({ uri: 'file://front.jpg' });
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
      .mockResolvedValueOnce({ objectPath: 'user-1/2026-08-30/front_123.jpg', bytes: 1000 })
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ objectPath: 'user-1/2026-08-30/back_123.jpg', bytes: 1000 });
    const onClose = jest.fn();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { renderer, getByLabelText } = renderSheet({ onClose });

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
      front_url: 'user-1/2026-08-30/front_123.jpg',
      back_url: 'user-1/2026-08-30/back_123.jpg',
      side_left_url: null,
      side_right_url: null,
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => renderer.root.findByProps({ testID: 'photo-capture-sheet' }).props.onTouchEnd());
    expect(alert.mock.calls.at(-1)?.[1]).toBe('Saved photos will stay saved. Unsaved photo changes will be discarded.');
    act(() => alert.mock.calls.at(-1)?.[2]?.find((action) => action.text === 'Keep editing')?.onPress?.());
    expect(getByLabelText('Left photo, upload failed')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    act(() => renderer.root.findByProps({ testID: 'photo-capture-sheet' }).props.onTouchEnd());
    act(() => alert.mock.calls.at(-1)?.[2]?.find((action) => action.text === 'Discard')?.onPress?.());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  });

  it('uses a synchronous guard to ignore same-tick duplicate saves', async () => {
    const upload = deferred<{ objectPath: string; bytes: number }>();
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
      upload.resolve({ objectPath: 'user-1/2026-08-30/front_123.jpg', bytes: 1000 });
      await Promise.all([firstSave, secondSave]);
    });
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  });

  it('locks slot mutations while the database save is pending', async () => {
    const databaseSave = deferred<void>();
    mockUploadPhoto.mockResolvedValue({
      objectPath: 'user-1/2026-08-30/front_123.jpg',
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
    const upload = deferred<{ objectPath: string; bytes: number }>();
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
      upload.resolve({ objectPath: 'user-1/2026-08-30/stale_123.jpg', bytes: 1000 });
      await savePromise;
    });

    expect(renderer.root.findByType(ExpoImage).props.source).toEqual({
      uri: 'https://example.com/replacement.jpg',
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('ignores a stale upload completion after the pending selection is discarded', async () => {
    const upload = deferred<{ objectPath: string; bytes: number }>();
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
      upload.resolve({ objectPath: 'user-1/2026-08-30/stale_123.jpg', bytes: 1000 });
      await savePromise;
    });

    expect(getByLabelText('Front photo, empty')).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('does not persist an upload that completes after the sheet unmounts', async () => {
    const upload = deferred<{ objectPath: string; bytes: number }>();
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
      upload.resolve({ objectPath: 'user-1/2026-08-30/stale_123.jpg', bytes: 1000 });
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

  it('keeps a dirty sheet native-locked through Keep editing, then allows explicit Discard', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onClose = jest.fn();
    const { renderer, getByLabelText } = renderSheet({ onClose });

    await act(async () => {
      await getByLabelText('Choose Front photo from library').props.onPress();
    });

    const sheet = renderer.root.findByProps({ testID: 'photo-capture-sheet' });
    expect(sheet.props.accessibilityState).toEqual({ disabled: true });
    act(() => sheet.props.onTouchEnd());

    const firstConfirmation = alert.mock.calls.at(-1);
    expect(firstConfirmation?.[0]).toBe('Discard photo changes?');
    expect(firstConfirmation?.[2]?.map((action) => action.text)).toEqual([
      'Keep editing',
      'Discard',
    ]);
    const keepEditing = firstConfirmation?.[2]?.find((action) => action.text === 'Keep editing');
    act(() => keepEditing?.onPress?.());
    expect(onClose).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ testID: 'photo-capture-sheet' })).toBeTruthy();

    act(() => sheet.props.onTouchEnd());
    const discard = alert.mock.calls
      .at(-1)?.[2]
      ?.find((action) => action.text === 'Discard');
    act(() => discard?.onPress?.());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows an idle clean sheet to dismiss without confirmation', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onClose = jest.fn();
    const { renderer } = renderSheet({ onClose });
    const sheet = renderer.root.findByProps({ testID: 'photo-capture-sheet' });

    expect(sheet.props.accessibilityState).toEqual({ disabled: false });
    act(() => sheet.props.onTouchEnd());

    expect(alert).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('blocks every dismissal path while database persistence is in flight', async () => {
    const databaseSave = deferred<void>();
    mockUploadPhoto.mockResolvedValue({
      objectPath: 'user-1/2026-08-30/front_123.jpg',
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


  it('discards selected images and late uploads when the authenticated owner changes', async () => {
    const upload = deferred<{ objectPath: string; bytes: number }>();
    mockUploadPhoto.mockReturnValue(upload.promise);
    const { getByLabelText, update, renderer } = renderSheet();
    await act(async () => { await getByLabelText('Choose Front photo from library').props.onPress(); });
    let savePromise!: Promise<void>;
    act(() => { savePromise = getByLabelText('Save photos').props.onPress(); });
    mockUserId = 'user-2';
    update(true, null);
    await act(async () => {
      upload.resolve({ objectPath: 'user-1/2026-08-30/front_123.jpg', bytes: 100 });
      await savePromise;
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType(ExpoImage)).toHaveLength(0);
  });

  it('saves the original object reference even while a signed URL is displayed', async () => {
    mockUserId = '11111111-1111-4111-8111-111111111111';
    const reference = `${mockUserId}/2026-08-30/front_123.jpg`;
    mockSignedDisplay = 'https://fixture.supabase.co/storage/v1/object/sign/progress_photos/photo?token=fake';
    const { renderer, getByLabelText } = renderSheet({ existing: {
      id: 'row', user_id: mockUserId, date: '2026-08-30', front_url: reference,
      back_url: null, side_left_url: null, side_right_url: null,
    } });
    expect(renderer.root.findByType(ExpoImage).props.source.uri).toBe(mockSignedDisplay);
    await act(async () => { await getByLabelText('Save photos').props.onPress(); });
    expect(mockMutateAsync).toHaveBeenCalledWith({
      date: '2026-08-30', front_url: reference, back_url: null, side_left_url: null, side_right_url: null,
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
