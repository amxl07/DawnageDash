import { HIT_SLOP_MIN } from '@/theme/tokens';
import { Image, type ImageProps } from 'expo-image';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/components/ui';
import { usePrivatePhotoUrl } from '@/hooks/usePrivatePhotoUrl';

export function PrivatePhoto({ reference, ownerId, ...props }: Omit<ImageProps, 'source' | 'cachePolicy' | 'recyclingKey'> & {
  reference: string;
  ownerId?: string;
}) {
  const photo = usePrivatePhotoUrl(reference, ownerId);
  if (!photo.url) return (
    <View style={[props.style, { alignItems: 'center', justifyContent: 'center' }]}>
      {photo.loading ? <ActivityIndicator accessibilityLabel="Loading private photo" /> : (
        <Pressable onPress={(event) => { event.stopPropagation(); photo.refresh(); }} accessibilityRole="button" accessibilityLabel="Photo unavailable. Retry photo access" style={{ minHeight: HIT_SLOP_MIN, justifyContent: 'center' }}>
          <Text variant="bodySm" tone="muted">Retry photo</Text>
        </Pressable>
      )}
    </View>
  );
  return <Image {...props} source={{ uri: photo.url }} cachePolicy="none" recyclingKey={photo.url} />;
}
