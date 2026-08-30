import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';

import { Button, Card, Sheet, SheetScrollView, Text } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { usePhotoMutation, type PhotoRow } from '@/hooks/useProgressPhotos';
import { ANGLES, MAX_SOURCE_BYTES, uploadPhoto, type AngleKey } from '@/lib/photos';
import { parseLocalDate } from '@/lib/dates';
import { spacing } from '@/theme';
import { PhotoSlot, type SlotState } from './PhotoSlot';

const emptySlots = (): Record<AngleKey, SlotState> =>
  Object.fromEntries(
    ANGLES.map((a) => [
      a.key,
      { url: null, uploading: false, error: null, errorKind: null, pendingUri: null },
    ]),
  ) as Record<AngleKey, SlotState>;

type Operation = { id: number; session: number };

type Props = {
  visible: boolean;
  onClose: () => void;
  date: string;
  existing: PhotoRow | null;
  /** Previous week's row, used for the ghost overlay. */
  ghost: PhotoRow | null;
};

export function PhotoCaptureSheet({ visible, onClose, date, existing, ghost }: Props) {
  const { user } = useAuth();
  const mutation = usePhotoMutation();

  const [slots, setSlots] = useState<Record<AngleKey, SlotState>>(emptySlots);
  const [showGuide, setShowGuide] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [interactionLocked, setInteractionLocked] = useState(false);
  const slotsRef = useRef(slots);
  const sessionRef = useRef(0);
  const operationRef = useRef(0);
  const inFlightRef = useRef(false);
  const wasVisibleRef = useRef(false);
  const sessionDateRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      sessionRef.current += 1;
      operationRef.current += 1;
      inFlightRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!visible) {
      if (wasVisibleRef.current) {
        sessionRef.current += 1;
        operationRef.current += 1;
      }
      wasVisibleRef.current = false;
      sessionDateRef.current = null;
      inFlightRef.current = false;
      setInteractionLocked(false);
      return;
    }

    if (wasVisibleRef.current && sessionDateRef.current === date) return;
    wasVisibleRef.current = true;
    sessionDateRef.current = date;
    sessionRef.current += 1;
    operationRef.current += 1;
    inFlightRef.current = false;
    setInteractionLocked(false);

    const next = emptySlots();
    if (existing) {
      next.front.url = existing.front_url;
      next.back.url = existing.back_url;
      next.side_left.url = existing.side_left_url;
      next.side_right.url = existing.side_right_url;
    }
    slotsRef.current = next;
    setSlots(next);
    setDirty(false);
    setSaveError(null);
  }, [date, existing, visible]);

  const patch = (key: AngleKey, fields: Partial<SlotState>) => {
    const next = {
      ...slotsRef.current,
      [key]: { ...slotsRef.current[key], ...fields },
    };
    slotsRef.current = next;
    setSlots(next);
  };

  const canMutateSlots = () => !inFlightRef.current && !mutation.isPending;

  const beginOperation = (): Operation | null => {
    if (!canMutateSlots()) return null;
    const operation = { id: operationRef.current + 1, session: sessionRef.current };
    operationRef.current = operation.id;
    inFlightRef.current = true;
    setInteractionLocked(true);
    return operation;
  };

  const isCurrentOperation = (operation: Operation) =>
    operation.id === operationRef.current && operation.session === sessionRef.current;

  const finishOperation = (operation: Operation) => {
    if (!isCurrentOperation(operation)) return;
    inFlightRef.current = false;
    setInteractionLocked(false);
  };

  const closeSession = () => {
    sessionRef.current += 1;
    operationRef.current += 1;
    inFlightRef.current = false;
    setInteractionLocked(false);
    onClose();
  };

  const ensurePermission = async (mode: 'camera' | 'library'): Promise<boolean> => {
    const req =
      mode === 'camera'
        ? ImagePicker.requestCameraPermissionsAsync
        : ImagePicker.requestMediaLibraryPermissionsAsync;
    const { granted, canAskAgain } = await req();
    if (granted) return true;
    Alert.alert(
      mode === 'camera' ? 'Camera access needed' : 'Photo access needed',
      canAskAgain
        ? 'Allow access to add your progress photo.'
        : 'Enable access in Settings to add your progress photo.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ],
    );
    return false;
  };

  const pick = async (key: AngleKey, mode: 'camera' | 'library') => {
    if (!canMutateSlots()) return;
    const session = sessionRef.current;
    if (!(await ensurePermission(mode))) return;
    if (!canMutateSlots() || session !== sessionRef.current) return;
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    };
    const result =
      mode === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
    if (!canMutateSlots() || session !== sessionRef.current) return;
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_SOURCE_BYTES) {
      patch(key, {
        error: 'That image is over 10MB. Pick a smaller one.',
        errorKind: 'selection',
      });
      return;
    }
    patch(key, {
      pendingUri: asset.uri,
      pendingDims: { width: asset.width, height: asset.height },
      error: null,
      errorKind: null,
    });
    setDirty(true);
    void Haptics.selectionAsync();
  };

  const chooseSource = (key: AngleKey) => {
    if (!canMutateSlots()) return;
    Alert.alert(ANGLES.find((a) => a.key === key)!.label, 'Add a photo', [
      { text: 'Take photo', onPress: () => void pick(key, 'camera') },
      { text: 'Choose from library', onPress: () => void pick(key, 'library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const requestClose = () => {
    if (inFlightRef.current || mutation.isPending) {
      setSaveError('Saving photos. Please wait for saving to finish.');
      Alert.alert('Saving photos', 'Please wait for saving to finish.', [{ text: 'OK' }]);
      return;
    }
    if (!dirty) {
      closeSession();
      return;
    }
    Alert.alert('Discard photo changes?', 'Selected photos have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: closeSession },
    ]);
  };

  const uploadAngle = async (key: AngleKey, operation: Operation) => {
    const angle = ANGLES.find((candidate) => candidate.key === key);
    const slot = slotsRef.current[key];
    const pendingUri = slot.pendingUri;
    if (!angle || !pendingUri) return 'skipped' as const;

    patch(key, { uploading: true, error: null, errorKind: null });
    try {
      const { publicUrl } = await uploadPhoto(
        pendingUri,
        user!.id,
        date,
        angle.label,
        slot.pendingDims,
      );
      if (
        !isCurrentOperation(operation) ||
        slotsRef.current[key].pendingUri !== pendingUri
      ) {
        return 'stale' as const;
      }

      patch(key, {
        url: publicUrl,
        uploading: false,
        pendingUri: null,
        pendingDims: undefined,
        error: null,
        errorKind: null,
      });
      return 'success' as const;
    } catch {
      if (
        !isCurrentOperation(operation) ||
        slotsRef.current[key].pendingUri !== pendingUri
      ) {
        return 'stale' as const;
      }

      patch(key, {
        uploading: false,
        error: 'Upload failed. Your selected photo is still here.',
        errorKind: 'upload',
      });
      return 'failed' as const;
    }
  };

  const persistUploadedUrls = async (operation: Operation) => {
    if (!isCurrentOperation(operation)) return false;
    const current = slotsRef.current;
    await mutation.mutateAsync({
      date,
      front_url: current.front.url,
      back_url: current.back.url,
      side_left_url: current.side_left.url,
      side_right_url: current.side_right.url,
    });
    return isCurrentOperation(operation);
  };

  const save = async () => {
    if (!user?.id) return;
    const operation = beginOperation();
    if (!operation) return;
    setSaveError(null);

    try {
      const pendingAngles = ANGLES.filter((angle) => slotsRef.current[angle.key].pendingUri);
      const uploadResults = await Promise.all(
        pendingAngles.map((angle) => uploadAngle(angle.key, operation)),
      );
      if (!isCurrentOperation(operation) || uploadResults.includes('stale')) return;

      if (uploadResults.includes('failed')) {
        setSaveError("Couldn't upload every photo. Retry each failed photo when you're ready.");
        return;
      }

      if (!(await persistUploadedUrls(operation))) return;

      setDirty(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeSession();
    } catch {
      if (isCurrentOperation(operation)) {
        setSaveError("Couldn't save. Check your connection and try again.");
      }
    } finally {
      finishOperation(operation);
    }
  };

  const retry = async (key: AngleKey) => {
    if (!user?.id) return;
    const slot = slotsRef.current[key];
    if (!slot.pendingUri || !slot.error || slot.errorKind === 'selection') return;

    const operation = beginOperation();
    if (!operation) return;
    setSaveError(null);

    try {
      const uploadResult = await uploadAngle(key, operation);
      if (!isCurrentOperation(operation) || uploadResult === 'stale') return;
      if (uploadResult === 'failed') {
        setSaveError("Couldn't upload that photo. Your selection is still here.");
        return;
      }

      if (!(await persistUploadedUrls(operation))) return;

      const hasUnsentSelections = Object.values(slotsRef.current).some(
        (candidate) => candidate.pendingUri,
      );
      setDirty(hasUnsentSelections);
      if (hasUnsentSelections) {
        setSaveError('That photo is saved. Other selected photos still need attention.');
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeSession();
    } catch {
      if (isCurrentOperation(operation)) {
        setSaveError("Couldn't save. Check your connection and try again.");
      }
    } finally {
      finishOperation(operation);
    }
  };

  const uploading = Object.values(slots).some((s) => s.uploading);
  const saving = interactionLocked || mutation.isPending;
  const filled = Object.values(slots).filter((s) => s.url || s.pendingUri).length;

  const ghostFor = (key: AngleKey): string | null => {
    if (!ghost) return null;
    const col = ANGLES.find((a) => a.key === key)!.column as keyof PhotoRow;
    return (ghost[col] as string | null) ?? null;
  };

  return (
    <Sheet
      visible={visible}
      onClose={requestClose}
      title={`Photos · ${format(parseLocalDate(date), 'd MMM yyyy')}`}
      dismissible={!dirty && !saving}
    >
      <SheetScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
        <Text variant="bodySm" tone="muted">
          Photos upload to Dawnage only after you tap Save photos. They are used for progress review with your coaching team. You can leave any angle empty and return later.
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text variant="bodySm" tone="muted" style={{ flex: 1 }}>
            {ghost
              ? 'Last week’s shot is shown faintly behind — line up with it so the photos compare cleanly.'
              : 'Stand square to the camera, same spot and lighting each week.'}
          </Text>
          <Pressable
            onPress={() => setShowGuide((v) => !v)}
            accessibilityRole="switch"
            accessibilityLabel="Show alignment guide"
            accessibilityState={{ checked: showGuide }}
            hitSlop={8}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text variant="bodySm" tone="primary">
              {showGuide ? 'Hide guide' : 'Show guide'}
            </Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {ANGLES.map((angle) => (
            <View key={angle.key} style={{ width: '47%' }}>
              <PhotoSlot
                angle={angle.key}
                state={slots[angle.key]}
                ghostUrl={ghostFor(angle.key)}
                showGuide={showGuide}
                onChoose={() => chooseSource(angle.key)}
                onChooseFromLibrary={() => void pick(angle.key, 'library')}
                onRemove={() => {
                  if (!canMutateSlots()) return;
                  patch(angle.key, {
                    url: null,
                    pendingUri: null,
                    pendingDims: undefined,
                    error: null,
                    errorKind: null,
                  });
                  setDirty(true);
                }}
                onRetry={() => void retry(angle.key)}
                retryDisabled={uploading || mutation.isPending}
                disabled={saving}
              />
            </View>
          ))}
        </View>

        {filled < 4 ? (
          <Card>
            <Text variant="bodySm" tone="muted">
              {filled} of 4 angles added. Partial sets are fine — you can come back and finish.
            </Text>
          </Card>
        ) : null}

        {saveError ? (
          <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">
            {saveError}
          </Text>
        ) : null}
      </SheetScrollView>

      <View style={{ padding: spacing.base }}>
        <Button
          label={uploading ? 'Uploading…' : 'Save photos'}
          onPress={save}
          loading={uploading || mutation.isPending}
          disabled={saving}
        />
      </View>
    </Sheet>
  );
}
