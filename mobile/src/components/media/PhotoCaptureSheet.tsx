import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { Camera, ImageIcon, RotateCcw, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, View } from 'react-native';

import { Button, Card, Sheet, SheetScrollView, Text } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { usePhotoMutation, type PhotoRow } from '@/hooks/useProgressPhotos';
import { ANGLES, MAX_SOURCE_BYTES, uploadPhoto, type AngleKey } from '@/lib/photos';
import { parseLocalDate } from '@/lib/dates';
import { iconSize, radius, spacing, useTheme } from '@/theme';
import { PoseGuide } from './PoseGuide';

type SlotState = {
  url: string | null;
  uploading: boolean;
  error: string | null;
  /** Kept on failure so a retry never needs a re-shoot. */
  pendingUri: string | null;
  pendingDims?: { width: number; height: number };
};

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
  const { colors } = useTheme();
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
      canAskAgain
        ? [{ text: 'OK' }]
        : [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => void Linking.openSettings() }],
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

      await Promise.all(
        ANGLES.map(async (angle) => {
          const slot = slots[angle.key];
          if (!slot.pendingUri) return;
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
          } catch {
            patch(angle.key, {
              uploading: false,
              error: 'Upload failed — tap Save photos to retry.',
            });
            throw new Error('photo-upload-failed');
          }
        }),
      );

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text variant="bodySm" tone="muted" style={{ flex: 1 }}>
            {ghost
              ? 'Last week’s shot is shown faintly behind — line up with it so the photos compare cleanly.'
              : 'Stand square to the camera, same spot and lighting each week.'}
            {' '}Photos upload only when you tap Save photos.
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
          {ANGLES.map((angle) => {
            const slot = slots[angle.key];
            return (
              <View key={angle.key} style={{ width: '47%', gap: spacing.xs }}>
                <Text variant="label" tone="muted">
                  {angle.label}
                </Text>
                <Pressable
                  onPress={() => chooseSource(angle.key)}
                  disabled={slot.uploading}
                  accessibilityRole="button"
                  accessibilityLabel={`${angle.label} photo, ${slot.url ? 'added' : 'empty'}`}
                  accessibilityHint={slot.error ? 'Tap to choose a different photo' : 'Tap to add a photo'}
                  style={{
                    aspectRatio: 3 / 4,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: slot.error ? colors.destructive : colors.borderStrong,
                    backgroundColor: colors.elevated,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {slot.url || slot.pendingUri ? (
                    <Image
                      source={{ uri: slot.pendingUri ?? slot.url! }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      accessible={false}
                    />
                  ) : (
                    <View style={{ alignItems: 'center', gap: spacing.xs }}>
                      <Camera size={iconSize.lg} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
                      <Text variant="bodySm" tone="muted">
                        Add
                      </Text>
                    </View>
                  )}

                  {!slot.url ? (
                    <PoseGuide angle={angle.key} ghostUrl={ghostFor(angle.key)} visible={showGuide} />
                  ) : null}

                  {slot.uploading ? (
                    <View
                      style={{
                        position: 'absolute',
                        inset: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.scrim,
                      }}
                    >
                      <ActivityIndicator color={colors.onPrimary} />
                    </View>
                  ) : null}
                </Pressable>

                {slot.error ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <RotateCcw size={14} color={colors.destructive} strokeWidth={2} accessible={false} />
                    <Text variant="bodySm" tone="primary" style={{ flex: 1 }}>
                      {slot.error}
                    </Text>
                  </View>
                ) : slot.url || slot.pendingUri ? (
                  <Pressable
                    onPress={() => {
                      patch(angle.key, { url: null, pendingUri: null, error: null });
                      setDirty(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${angle.label} photo`}
                    hitSlop={8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 36 }}
                  >
                    <Trash2 size={14} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
                    <Text variant="bodySm" tone="muted">
                      Remove
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => void pick(angle.key, 'library')}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${angle.label} from library`}
                    hitSlop={8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 36 }}
                  >
                    <ImageIcon size={14} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
                    <Text variant="bodySm" tone="muted">
                      Library
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
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
