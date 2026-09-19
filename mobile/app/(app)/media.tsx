import { PrivatePhoto } from '@/components/media/PrivatePhoto';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Camera, Columns2, Plus } from 'lucide-react-native';
import { memo, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { PhotoCaptureSheet } from '@/components/media/PhotoCaptureSheet';
import {
  PhotoViewer,
  photoPositionForSourceIndex,
  type PhotoFocusTarget,
  type ViewerPhoto,
} from '@/components/media/PhotoViewer';
import {
  AnimatedFlatList,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Screen,
  Skeleton,
  Text,
  useListMotion,
} from '@/components/ui';
import { useProgressPhotos, type PhotoRow } from '@/hooks/useProgressPhotos';
import { useAuth } from '@/contexts/AuthContext';
import { ANGLES } from '@/lib/photos';
import { localDateString, parseLocalDate } from '@/lib/dates';
import { iconSize, radius, spacing, useMotion, useTheme } from '@/theme';

const urlsOf = (row: PhotoRow) =>
  ANGLES.map((a) => ({ label: a.label, url: row[a.column as keyof PhotoRow] as string | null }));

function PhotoWeekSkeleton() {
  return (
    <Card testID="photo-week-skeleton" style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Skeleton width="32%" height={22} />
        <Skeleton width="24%" height={14} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        {ANGLES.map((angle) => (
          <View
            key={angle.key}
            testID="photo-thumbnail-skeleton"
            style={{ width: '22%', aspectRatio: 3 / 4 }}
          >
            <Skeleton width="100%" height="100%" />
          </View>
        ))}
      </View>
      <Skeleton width="62%" height={16} />
    </Card>
  );
}

const WeekCard = memo(function WeekCard({
  row,
  weekNumber,
  onEdit,
  onOpen,
  onCompare,
  canCompare,
}: {
  row: PhotoRow;
  weekNumber: number;
  onEdit: () => void;
  onOpen: (i: number, target: PhotoFocusTarget | null) => void;
  onCompare: (target: PhotoFocusTarget | null) => void;
  canCompare: boolean;
}) {
  const { colors } = useTheme();
  const motion = useMotion();
  const items = urlsOf(row);
  const thumbnailRefs = useRef<(View | null)[]>([]);
  const compareRef = useRef<View>(null);
  const count = items.filter((i) => i.url).length;
  const isBaseline = weekNumber === 0;

  return (
    <Card
      style={{
        gap: spacing.md,
        marginBottom: spacing.md,
        borderColor: isBaseline ? colors.primary : colors.border,
        borderWidth: isBaseline ? 2 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text variant="h2">Week {weekNumber}</Text>
            {isBaseline ? <Badge label="Baseline" tone="primary" /> : null}
          </View>
          <Text variant="bodySm" tone="muted">
            {format(parseLocalDate(row.date), 'd MMM yyyy')}
          </Text>
        </View>
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Edit week ${weekNumber} photos`}
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: 'center',
            borderRadius: radius.sm,
            paddingHorizontal: spacing.xs,
            backgroundColor: pressed ? colors.pressed : 'transparent',
          })}
        >
          <Text variant="bodySm" tone="primary">
            Edit
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {items.map((item, i) => (
          <Pressable
            key={item.label}
            ref={(target) => {
              thumbnailRefs.current[i] = target;
            }}
            disabled={!item.url}
            onPress={() => onOpen(i, thumbnailRefs.current[i])}
            accessibilityRole="button"
            accessibilityLabel={
              item.url
                ? `${item.label} photo, week ${weekNumber}. Tap to view full screen.`
                : `${item.label} photo missing`
            }
            style={({ pressed }) => ({
              flex: 1,
              aspectRatio: 3 / 4,
              borderRadius: radius.sm,
              overflow: 'hidden',
              backgroundColor: colors.elevated,
              borderWidth: 1,
              borderColor: pressed ? colors.primaryPressed : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            {item.url ? (
              <PrivatePhoto
                reference={item.url}
                ownerId={row.user_id}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={motion.reduced ? 0 : Math.min(160, motion.duration.micro)}
                accessible={false}
              />
            ) : (
              <Text variant="bodySm" tone="muted">
                {item.label}
              </Text>
            )}
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Text variant="bodySm" tone={count === 4 ? 'muted' : 'gold'} style={{ flex: 1 }}>
          {count === 4 ? 'All 4 angles' : `${count}/4 photos — add the rest when you can`}
        </Text>
        {canCompare ? (
          <Pressable
            ref={compareRef}
            onPress={() => onCompare(compareRef.current)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Compare week ${weekNumber} with the baseline`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              minHeight: 44,
              borderRadius: radius.sm,
              paddingHorizontal: spacing.xs,
              backgroundColor: pressed ? colors.pressed : 'transparent',
            })}
          >
            <Columns2 size={iconSize.sm} color={colors.primary} strokeWidth={2} accessible={false} />
            <Text variant="bodySm" tone="primary">
              Compare
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
});

export default function MediaScreen() {
  const { user } = useAuth();
  return <MediaContent key={user?.id ?? 'signed-out'} />;
}

function MediaContent() {
  const { colors } = useTheme();
  const listMotion = useListMotion();
  const router = useRouter();
  const { data: rows, isLoading, isError, refetch } = useProgressPhotos();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editDate, setEditDate] = useState<string>(localDateString());
  const [viewer, setViewer] = useState<{
    photos: ViewerPhoto[];
    index: number;
    returnFocusTarget: PhotoFocusTarget | null;
  } | null>(null);

  // rows newest-first; the OLDEST row is Week 0 (baseline).
  const baseline = rows?.length ? rows[rows.length - 1] : null;
  const editingRow = useMemo(
    () => rows?.find((r) => r.date === editDate) ?? null,
    [rows, editDate],
  );
  /** Ghost = the most recent set strictly before the date being edited. */
  const ghostRow = useMemo(
    () => rows?.find((r) => r.date < editDate) ?? null,
    [rows, editDate],
  );

  const openWeek = (
    row: PhotoRow,
    weekNumber: number,
    index: number,
    returnFocusTarget: PhotoFocusTarget | null,
  ) => {
    const sourceSlots = urlsOf(row);
    const viewerIndex = photoPositionForSourceIndex(sourceSlots, index);
    if (viewerIndex == null) return;

    const photos = sourceSlots
      .filter((i) => i.url)
      .map((i) => ({
        label: i.label,
        weekLabel: `Week ${weekNumber}`,
        url: i.url!,
        caption: format(parseLocalDate(row.date), 'd MMM yyyy'),
      }));
    if (photos.length) setViewer({ photos, index: viewerIndex, returnFocusTarget });
  };

  const compareWithBaseline = (
    row: PhotoRow,
    weekNumber: number,
    returnFocusTarget: PhotoFocusTarget | null,
  ) => {
    if (!baseline) return;
    const photos: ViewerPhoto[] = [];
    for (const a of ANGLES) {
      const now = row[a.column as keyof PhotoRow] as string | null;
      const then = baseline[a.column as keyof PhotoRow] as string | null;
      if (then) {
        photos.push({
          label: a.label,
          weekLabel: 'Week 0',
          url: then,
          caption: format(parseLocalDate(baseline.date), 'd MMM yyyy'),
        });
      }
      if (now) {
        photos.push({
          label: a.label,
          weekLabel: `Week ${weekNumber}`,
          url: now,
          caption: format(parseLocalDate(row.date), 'd MMM yyyy'),
        });
      }
    }
    if (photos.length) setViewer({ photos, index: 0, returnFocusTarget });
  };

  if (isLoading) {
    return (
      <Screen>
        <PageHeader title="Progress photos" onBack={() => router.back()} />
        <View
          testID="progress-skeleton"
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Loading progress photos"
          accessibilityState={{ busy: true }}
          style={{ gap: spacing.base }}
        >
          <PhotoWeekSkeleton />
          <PhotoWeekSkeleton />
        </View>
      </Screen>
    );
  }

  if (isError && rows === undefined) {
    return (
      <Screen>
        <PageHeader title="Progress photos" onBack={() => router.back()} />
        <ErrorState onRetry={refetch} />
      </Screen>
    );
  }

  const header = (
    <View style={{ gap: spacing.base, marginBottom: spacing.base }}>
      <PageHeader title="Progress photos" onBack={() => router.back()} />
      {isError ? (
        <ErrorState
          title="Photo history couldn’t refresh"
          message="Your saved photo sets are still shown below. Retry when you’re connected."
          onRetry={refetch}
        />
      ) : null}
      <Button
        testID="photo-add-current-week"
        label="Add this week's photos"
        icon={<Plus size={iconSize.md} color={colors.onPrimary} strokeWidth={2.5} />}
        onPress={() => {
          setEditDate(localDateString());
          setSheetOpen(true);
        }}
      />
    </View>
  );

  return (
    <>
      <Screen scroll={false}>
        <AnimatedFlatList
          data={rows ?? []}
          keyExtractor={(r) => r.id}
          ListHeaderComponent={header}
          renderItem={({ item, index }) => {
            const weekNumber = (rows?.length ?? 1) - 1 - index;
            return (
              <WeekCard
                row={item}
                weekNumber={weekNumber}
                canCompare={Boolean(baseline) && weekNumber !== 0}
                onEdit={() => {
                  setEditDate(item.date);
                  setSheetOpen(true);
                }}
                onOpen={(i, target) => openWeek(item, weekNumber, i, target)}
                onCompare={(target) => compareWithBaseline(item, weekNumber, target)}
              />
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={Camera}
              title="No progress photos yet"
              message="Choose only the angles you want. Nothing uploads until you tap Save photos; your first saved set becomes the baseline."
              actionLabel="Add your first set"
              onAction={() => {
                setEditDate(localDateString());
                setSheetOpen(true);
              }}
            />
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          windowSize={5}
          itemLayoutAnimation={listMotion.itemLayoutAnimation}
        />
      </Screen>

      <PhotoCaptureSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        date={editDate}
        existing={editingRow}
        ghost={ghostRow}
      />

      {viewer ? (
        <PhotoViewer
          photos={viewer.photos}
          startIndex={viewer.index}
          onClose={() => setViewer(null)}
          returnFocusTarget={viewer.returnFocusTarget}
        />
      ) : null}
    </>
  );
}
