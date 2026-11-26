import { Tabs } from 'expo-router/js-tabs';
import { CheckCircle2, Dumbbell, House, UserRound, Utensils } from 'lucide-react-native';
import { Text } from 'react-native';
import { useCheckInTabStatus } from './useCheckInTabStatus';
import { fonts, iconSize, useTheme } from '@/theme';

/** Web keeps semantic React Navigation tabs; native modules stay out of its bundle. */
export function AppTabs() {
  const { colors } = useTheme();
  const checkIn = useCheckInTabStatus();
  return <Tabs screenOptions={{ headerShown: false, animation: 'none', tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.mutedForeground, tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 'auto', minHeight: 64 },
    tabBarLabelPosition: 'below-icon',
    tabBarItemStyle: { paddingHorizontal: 0 },
    tabBarLabel: ({ color, children }) => <Text style={{ color, fontFamily: fonts.interMedium, fontSize: 11, lineHeight: 14, textAlign: 'center', alignSelf: 'stretch', marginHorizontal: -5, paddingBottom: 2 }}>{children}</Text> }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarAccessibilityLabel: 'Home, your dashboard', tabBarIcon: ({ color }) => <House color={color} size={iconSize.md} /> }} />
    <Tabs.Screen name="check-in" options={{ title: 'Check In', tabBarAccessibilityLabel: checkIn.label, tabBarBadge: checkIn.needsCheckIn ? '•' : undefined, tabBarIcon: ({ color }) => <CheckCircle2 color={color} size={iconSize.md} /> }} />
    <Tabs.Screen name="plans" options={{ title: 'Training', tabBarAccessibilityLabel: 'Training plan and workout history', tabBarIcon: ({ color }) => <Dumbbell color={color} size={iconSize.md} /> }} />
    <Tabs.Screen name="nutrition" options={{ title: 'Nutrition', tabBarAccessibilityLabel: 'Nutrition plan and coach notes', tabBarIcon: ({ color }) => <Utensils color={color} size={iconSize.md} /> }} />
    <Tabs.Screen name="more" options={{ title: 'You', tabBarAccessibilityLabel: 'You, profile and settings', tabBarIcon: ({ color }) => <UserRound color={color} size={iconSize.md} /> }} />
  </Tabs>;
}
