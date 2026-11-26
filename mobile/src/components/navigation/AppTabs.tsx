import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useReducedTransparency } from '@/hooks/useReducedTransparency';
import { useCheckInTabStatus } from './useCheckInTabStatus';
import { useTheme } from '@/theme';
import { NativeTabsContext } from './NavigationChrome';

/** SDK 57 native navigation. Guarded editors are parent-stack destinations. */
export function AppTabs() {
  const { colors } = useTheme();
  const checkIn = useCheckInTabStatus();
  const reduceTransparency = useReducedTransparency();
  return <NativeTabsContext value={true}>
    <NativeTabs tintColor={colors.primary} iconColor={{ default: colors.mutedForeground, selected: colors.primary }}
      backgroundColor={reduceTransparency ? colors.card : undefined} disableTransparentOnScrollEdge>
      <NativeTabs.Trigger name="index" accessibilityLabel="Home, your dashboard" testID="tab-home" disableAutomaticContentInsets={Platform.OS === 'ios'}>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="check-in" accessibilityLabel={checkIn.label} testID="tab-checkin" disableAutomaticContentInsets={Platform.OS === 'ios'}>
        <NativeTabs.Trigger.Label>Check In</NativeTabs.Trigger.Label>
        {checkIn.needsCheckIn ? <NativeTabs.Trigger.Badge>•</NativeTabs.Trigger.Badge> : null}
        <NativeTabs.Trigger.Icon sf={{ default: 'checkmark.circle', selected: 'checkmark.circle.fill' }} md="check_circle" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plans" accessibilityLabel="Training plan and workout history" testID="tab-training" disableAutomaticContentInsets={Platform.OS === 'ios'}>
        <NativeTabs.Trigger.Label>Training</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }} md="fitness_center" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="nutrition" accessibilityLabel="Nutrition plan and coach notes" testID="tab-nutrition" disableAutomaticContentInsets={Platform.OS === 'ios'}>
        <NativeTabs.Trigger.Label>Nutrition</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more" accessibilityLabel="You, profile and settings" testID="tab-you" disableAutomaticContentInsets={Platform.OS === 'ios'}>
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  </NativeTabsContext>;
}
