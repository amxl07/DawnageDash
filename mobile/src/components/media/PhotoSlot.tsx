import { Image } from 'expo-image';
import { Camera, ImageIcon, RotateCcw, Trash2 } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import type { AngleKey } from '@/lib/photos';
import { ANGLES } from '@/lib/photos';
import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';

import { PoseGuide } from './PoseGuide';

export type SlotState = {
  url: string | null;
  uploading: boolean;
  error: string | null;
  /** Omitted error kinds are treated as upload failures for existing callers. */
  errorKind?: 'selection' | 'upload' | null;
  /** Kept on failure so retry never requires another photo selection. */
  pendingUri: string | null;
  pendingDims?: { width: number; height: number };
};

type Props = {
  angle: AngleKey;
  state: SlotState;
  ghostUrl: string | null;
  showGuide: boolean;
  onChoose: () => void;
  onRemove: () => void;
  onChooseFromLibrary?: () => void;
  onRetry?: () => void;
  retryDisabled?: boolean;
  disabled?: boolean;
};

function slotStatus(state: SlotState) {
  if (state.uploading) return 'uploading';
  if (state.pendingUri && state.error && state.errorKind !== 'selection') return 'upload failed';
  if (state.pendingUri) return 'selected and not uploaded';
  if (state.url) return 'uploaded';
  return 'empty';
}

export function PhotoSlot({
  angle,
  state,
  ghostUrl,
  showGuide,
  onChoose,
  onRemove,
  onChooseFromLibrary = onChoose,
  onRetry,
  retryDisabled = false,
  disabled = false,
}: Props) {
  const { colors } = useTheme();
  const label = ANGLES.find((candidate) => candidate.key === angle)?.label ?? angle;
  const previewUri = state.pendingUri ?? state.url;
  const status = slotStatus(state);
  const failed = status === 'upload failed';
  const hasPhoto = Boolean(previewUri);
  const slotDisabled = disabled || state.uploading;
  const retryInactive = disabled || retryDisabled;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label" tone="muted">
        {label}
      </Text>

      <Pressable
        onPress={onChoose}
        disabled={slotDisabled}
        accessibilityRole="button"
        accessibilityLabel={`${label} photo, ${status}`}
        accessibilityHint={hasPhoto ? 'Choose a replacement photo' : 'Choose a photo'}
        accessibilityState={{ busy: state.uploading, disabled: slotDisabled }}
        style={{
          aspectRatio: 3 / 4,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: state.error ? colors.destructive : colors.borderStrong,
          backgroundColor: colors.elevated,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {previewUri ? (
          <Image
            source={{ uri: previewUri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={`${angle}:${previewUri}`}
            accessible={false}
          />
        ) : (
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <Camera
              size={iconSize.lg}
              color={colors.mutedForeground}
              strokeWidth={2}
              accessible={false}
            />
            <Text variant="bodySm" tone="muted">
              Add
            </Text>
          </View>
        )}

        {!state.url || state.pendingUri ? (
          <PoseGuide angle={angle} ghostUrl={ghostUrl} visible={showGuide} />
        ) : null}

        {state.uploading ? (
          <View
            pointerEvents="none"
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

      {state.error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <RotateCcw size={14} color={colors.destructive} strokeWidth={2} accessible={false} />
          <Text
            variant="bodySm"
            tone="primary"
            accessibilityLiveRegion="polite"
            style={{ flex: 1 }}
          >
            {state.error}
          </Text>
        </View>
      ) : null}

      {failed && onRetry ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          <Pressable
            onPress={onRetry}
            disabled={retryInactive}
            accessibilityRole="button"
            accessibilityLabel={`Retry ${label} photo upload`}
            accessibilityState={{ disabled: retryInactive, busy: state.uploading }}
            style={{
              minHeight: HIT_SLOP_MIN,
              flexGrow: 1,
              justifyContent: 'center',
              opacity: retryInactive ? 0.45 : 1,
            }}
          >
            <Text variant="bodySm" tone="primary">
              Retry upload
            </Text>
          </Pressable>
          <Pressable
            onPress={onRemove}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${label} photo`}
            accessibilityState={{ disabled }}
            style={{
              minHeight: HIT_SLOP_MIN,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              opacity: disabled ? 0.45 : 1,
            }}
          >
            <Trash2 size={14} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
            <Text variant="bodySm" tone="muted">
              Remove
            </Text>
          </Pressable>
        </View>
      ) : hasPhoto ? (
        <Pressable
          onPress={onRemove}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label} photo`}
          accessibilityState={{ disabled }}
          style={{
            minHeight: HIT_SLOP_MIN,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            opacity: disabled ? 0.45 : 1,
          }}
        >
          <Trash2 size={14} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
          <Text variant="bodySm" tone="muted">
            Remove
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={onChooseFromLibrary}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Choose ${label} photo from library`}
          accessibilityState={{ disabled }}
          style={{
            minHeight: HIT_SLOP_MIN,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            opacity: disabled ? 0.45 : 1,
          }}
        >
          <ImageIcon size={14} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
          <Text variant="bodySm" tone="muted">
            Library
          </Text>
        </Pressable>
      )}
    </View>
  );
}
