import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { getTabAccessDecision, useSession } from '@/session/session-context';
import { useTheme } from '@/theme/theme';

type TabIconProps = {
  md: string;
  selectedSf: string;
  sf: string;
};

function TabIcon({ md, selectedSf, sf }: TabIconProps) {
  return <NativeTabs.Trigger.Icon md={{ default: md as never, selected: md as never }} sf={{ default: sf as never, selected: selectedSf as never }} />;
}

function TabTrigger({ icon, label, name }: { icon: TabIconProps; label: string; name: string }) {
  return (
    <NativeTabs.Trigger accessibilityLabel={label} name={name as never}>
      <NativeTabs.Trigger.Label>{label}</NativeTabs.Trigger.Label>
      <TabIcon {...icon} />
    </NativeTabs.Trigger>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const { restoreStatus, session } = useSession();
  const access = getTabAccessDecision({ restoreStatus, session });

  if (access === 'restoring') {
    return (
      <View accessibilityLabel="Restoring your session" accessibilityRole="progressbar" style={{ alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: 12, justifyContent: 'center', padding: 24 }}>
        <ActivityIndicator color={colors.accent} />
        <AppText tone="muted">Restoring your session…</AppText>
      </View>
    );
  }

  if (access === 'redirect-welcome') {
    return <Redirect href="/welcome" />;
  }

  return (
    <NativeTabs backgroundColor={colors.surface} iconColor={{ default: colors.muted, selected: colors.accent }} labelStyle={{ default: { color: colors.muted }, selected: { color: colors.accent } }}>
      <TabTrigger icon={{ md: 'home', selectedSf: 'house.fill', sf: 'house' }} label="Today" name="index" />
      <TabTrigger icon={{ md: 'format_list_bulleted', selectedSf: 'list.bullet', sf: 'list.bullet' }} label="Diary" name="diary" />
      <TabTrigger icon={{ md: 'add_circle', selectedSf: 'plus.circle.fill', sf: 'plus.circle' }} label="Add" name="add" />
      <TabTrigger icon={{ md: 'insights', selectedSf: 'chart.line.uptrend.xyaxis', sf: 'chart.line.uptrend.xyaxis' }} label="Insights" name="insights" />
      <TabTrigger icon={{ md: 'person', selectedSf: 'person.fill', sf: 'person' }} label="You" name="settings" />
    </NativeTabs>
  );
}
