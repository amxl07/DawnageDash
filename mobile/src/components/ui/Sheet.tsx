import { X } from 'lucide-react-native';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { iconSize, radius, spacing, useMotion, useTheme } from '@/theme';
import { Text } from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Fraction of screen height the sheet occupies. */
  heightRatio?: number;
};

/**
 * Bottom sheet. Always has a visible close button — dismissal is never
 * gesture-only (§03.B.6).
 */
export function Sheet({ visible, onClose, title, children, heightRatio = 0.85 }: Props) {
  const { colors, shadow } = useTheme();
  const motion = useMotion();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType={motion.reduced ? 'none' : 'slide'}
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: colors.scrim }}
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
      />
      <View
        style={[
          {
            height: `${heightRatio * 100}%`,
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.card,
            borderTopRightRadius: radius.card,
            paddingBottom: insets.bottom,
          },
          shadow.sheet,
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.base,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text variant="h2">{title}</Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={iconSize.lg} color={colors.mutedForeground} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </Modal>
  );
}
