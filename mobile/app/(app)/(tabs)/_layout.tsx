import { Tabs } from 'expo-router';
import { CheckCircle2, ClipboardList, Dumbbell, LayoutDashboard, Menu } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDashboardData } from '@/hooks/useDashboardData';
import { useReducedTransparency } from '@/hooks/useReducedTransparency';
import { localDateString } from '@/lib/dates';
import { fonts, iconSize, radius, useTheme } from '@/theme';

/** Active tabs get a filled pill so the state reads at a glance, not just by hue. */
function TabIcon({
  Icon,
  color,
  focused,
  dot,
}: {
  Icon: typeof LayoutDashboard;
  color: string;
  focused: boolean;
  dot?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        minWidth: 46,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.pill,
        backgroundColor: focused ? colors.primaryFill : 'transparent',
      }}
    >
      <Icon size={iconSize.md} color={focused ? colors.onPrimary : color} strokeWidth={2} />
      {dot && !focused ? (
        <View
          style={{
            position: 'absolute',
            top: 1,
            right: 8,
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: colors.primary,
            borderWidth: 1.5,
            borderColor: colors.card,
          }}
        />
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedTransparency = useReducedTransparency();
  // The one piece of ambient state worth surfacing globally.
  const { processed } = useDashboardData();
  const today = localDateString();
  const needsCheckIn = !processed.some((p) => p.dateString === today && p.status === 'done');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'none',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarBackground:
          Platform.OS === 'ios' && !reducedTransparency
            ? () => (
                <BlurView
                  tint={isDark ? 'dark' : 'light'}
                  intensity={20}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
              )
            : undefined,
        tabBarStyle: {
          backgroundColor:
            Platform.OS === 'ios' && !reducedTransparency ? 'transparent' : colors.card,
          position: Platform.OS === 'ios' ? 'absolute' : 'relative',
          borderTopColor: colors.border,
          // Clear the home indicator / Android gesture bar.
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: fonts.interMedium, fontSize: 11, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home, your dashboard',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={LayoutDashboard} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="check-in"
        options={{
          title: 'Check In',
          tabBarAccessibilityLabel: 'Check in for today',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={CheckCircle2} color={color} focused={focused} dot={needsCheckIn} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Plans',
          tabBarAccessibilityLabel: 'Your training and nutrition plans',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={ClipboardList} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          tabBarAccessibilityLabel: 'Workout logs',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Dumbbell} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarAccessibilityLabel: 'More options',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Menu} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
