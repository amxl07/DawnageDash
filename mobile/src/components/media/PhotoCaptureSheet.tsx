import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
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
    ANGLES.map((a) => [a.key, { url: null, uploading: false, error: null, pendingUri: null }]),
  ) as Record<AngleKey, SlotState>;

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

  useEffect(() => {
    if (!visible) return;
    const next = emptySlots();
    if (existing) {
      next.front.url = existing.front_url;
      next.back.url = existing.back_url;
      next.side_left.url = existing.side_left_url;
      next.side_right.url = existing.side_right_url;
    }
    setSlots(next);
    setDirty(false);
    setSaveError(null);
  }, [visible, existing]);

  const patch = (key: AngleKey, p: Partial<SlotState>) =>
    setSlots((prev) => ({ ...prev, [key]: { ...prev[key], ...p } }));

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
    if (!(await ensurePermission(mode))) return;
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    };
    const result =
      mode === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_SOURCE_BYTES) {
      patch(key, { error: 'That image is over 10MB. Pick a smaller one.' });
      return;
    }
    patch(key, {
      pendingUri: asset.uri,
      pendingDims: { width: asset.width, height: asset.height },
      error: null,
    });
    setDirty(true);
    void Haptics.selectionAsync();
  };

  const chooseSource = (key: AngleKey) => {
    Alert.alert(ANGLES.find((a) => a.key === key)!.label, 'Add a photo', [
      { text: 'Take photo', onPress: () => void pick(key, 'camera') },
      { text: 'Choose from library', onPress: () => void pick(key, 'library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const requestClose = () => {
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert('Discard photo changes?', 'Selected photos have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onClose },
    ]);
  };

  const save = async () => {
    setSaveError(null);
    if (!user?.id) return;
    try {
      const urls: Record<AngleKey, string | null> = {
        front: slots.front.url,
        back: slots.back.url,
        side_left: slots.side_left.url,
        side_right: slots.side_right.url,
      };

      const uploadResults = await Promise.all(
        ANGLES.map(async (angle) => {
          const slot = slots[angle.key];
          if (!slot.pendingUri) return true;
          patch(angle.key, { uploading: true, error: null });
          try {
            const { publicUrl } = await uploadPhoto(
              slot.pendingUri,
              user.id,
              date,
              angle.label,
              slot.pendingDims,
            );
            urls[angle.key] = publicUrl;
            patch(angle.key, { url: publicUrl, uploading: false, pendingUri: null, error: null });
            return true;
          } catch {
            patch(angle.key, {
              uploading: false,
              error: 'Upload failed. Your selected photo is still here.',
            });
            return false;
          }
        }),
      );

      if (uploadResults.includes(false)) {
        setSaveError("Couldn't upload every photo. Retry the failed photo when you're ready.");
        return;
      }

      await mutation.mutateAsync({
        date,
        front_url: urls.front,
        back_url: urls.back,
        side_left_url: urls.side_left,
        side_right_url: urls.side_right,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch {
      setSaveError("Couldn't save. Check your connection and try again.");
    }
  };

  const uploading = Object.values(slots).some((s) => s.uploading);
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
                  patch(angle.key, { url: null, pendingUri: null, error: null });
                  setDirty(true);
                }}
                onRetry={() => void save()}
                retryDisabled={uploading || mutation.isPending}
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
          disabled={uploading}
        />
      </View>
    </Sheet>
  );
}
