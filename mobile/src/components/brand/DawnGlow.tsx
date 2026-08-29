import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { useTheme } from '@/theme';

/**
 * The brand's one signature: first light.
 *
 * "Dawnage" is dawn + age, the mark is a bird in forward flight, and the daily
 * ritual the whole product turns on is a *morning* weigh-in. So the app's one
 * decorative gesture is a directional wash from the top edge — brand red pushed
 * toward amber, as light breaking over a dark horizon.
 *
 * Used in exactly two places (auth, dashboard header) so it stays a signature
 * rather than wallpaper. Light theme gets a much weaker wash: on a white card
 * a strong tint reads as a rendering fault, not as atmosphere.
 */
export function DawnGlow({ height = 280, intensity = 1 }: { height?: number; intensity?: number }) {
  const { isDark } = useTheme();

  // Brand red → amber → out. Alpha only; the surface underneath shows through.
  const a = (v: number) => Math.min(1, v * intensity * (isDark ? 1 : 0.42));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}
    >
      <LinearGradient
        colors={[
          `rgba(240,78,69,${a(0.20)})`,
          `rgba(246,140,90,${a(0.09)})`,
          `rgba(246,200,90,${a(0.03)})`,
          'rgba(0,0,0,0)',
        ]}
        locations={[0, 0.35, 0.62, 1]}
        // Slightly off-vertical so the light has a direction, like a low sun.
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={{ flex: 1 }}
      />
    </View>
  );
}
