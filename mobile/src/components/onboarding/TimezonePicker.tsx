import { Search } from 'lucide-react-native';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';

import { Sheet, Text } from '@/components/ui';
import { listTimezones } from '@/lib/timezones';
import { HIT_SLOP_MIN, iconSize, radius, spacing, type, useTheme } from '@/theme';

const ROW_HEIGHT = HIT_SLOP_MIN;

const ZoneRow = memo(function ZoneRow({
  zone,
  selected,
  onSelect,
}: {
  zone: string;
  selected: boolean;
  onSelect: (z: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onSelect(zone)}
      accessibilityRole="button"
      accessibilityLabel={zone.replace(/_/g, ' ')}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        justifyContent: 'center',
        minHeight: ROW_HEIGHT,
        paddingHorizontal: spacing.base,
        backgroundColor: pressed ? colors.elevated : 'transparent',
      })}
    >
      <Text tone={selected ? 'primary' : 'default'}>{zone.replace(/_/g, ' ')}</Text>
    </Pressable>
  );
});

export function TimezonePicker({
  visible,
  onClose,
  selected,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  selected: string;
  onSelect: (z: string) => void;
}) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const zones = useMemo(() => listTimezones(), []);
  const data = useMemo(() => {
    if (!search) return zones;
    const q = search.toLowerCase().replace(/\s/g, '_');
    return zones.filter((z) => z.toLowerCase().includes(q));
  }, [zones, search]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Select timezone">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          margin: spacing.base,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: colors.elevated,
        }}
      >
        <Search size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search city or region"
          placeholderTextColor={colors.mutedForeground}
          accessibilityLabel="Search timezones"
          autoCorrect={false}
          autoCapitalize="none"
          style={[type.body, { flex: 1, color: colors.foreground, paddingVertical: spacing.md }]}
        />
      </View>
      <FlatList
        data={data}
        keyExtractor={(z) => z}
        renderItem={({ item }) => (
          <ZoneRow
            zone={item}
            selected={item === selected}
            onSelect={(z) => {
              onSelect(z);
              setSearch('');
              onClose();
            }}
          />
        )}
        getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        initialNumToRender={14}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
      />
    </Sheet>
  );
}
