import { Search } from 'lucide-react-native';
import { memo, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Sheet, SheetFlatList, Text } from '@/components/ui';
import { allCountryCodes } from '@/lib/countryCodes';
import { HIT_SLOP_MIN, iconSize, radius, spacing, type, useTheme } from '@/theme';

export type Country = (typeof allCountryCodes)[number];

type RowProps = { item: Country; selected: boolean; onSelect: (c: Country) => void };

// ~250 rows: memoized row + FlatList, never a mapped ScrollView (§03.D).
const CountryRow = memo(function CountryRow({ item, selected, onSelect }: RowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onSelect(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.country}, ${item.code}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: HIT_SLOP_MIN + 4,
        paddingHorizontal: spacing.base,
        backgroundColor: pressed ? colors.elevated : 'transparent',
      })}
    >
      <Text style={{ fontSize: 22 }}>{item.flag}</Text>
      <Text style={{ flex: 1 }} tone={selected ? 'primary' : 'default'}>
        {item.country}
      </Text>
      <Text tone="muted" numeric>
        {item.code}
      </Text>
    </Pressable>
  );
});

const ROW_HEIGHT = HIT_SLOP_MIN + 4;

export function CountryPicker({
  visible,
  onClose,
  onSelect,
  selected,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (c: Country) => void;
  selected: Country | null;
}) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const data = useMemo(() => {
    if (!search) return allCountryCodes;
    const q = search.toLowerCase();
    return allCountryCodes.filter(
      (c) => c.country.toLowerCase().includes(q) || c.code.includes(q),
    );
  }, [search]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Select country">
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
          placeholder="Search country or code"
          placeholderTextColor={colors.mutedForeground}
          accessibilityLabel="Search countries"
          autoCorrect={false}
          style={[type.body, { flex: 1, color: colors.foreground, paddingVertical: spacing.md }]}
        />
      </View>

      <SheetFlatList
        data={data}
        keyExtractor={(item, i) => `${item.country}-${item.code}-${i}`}
        renderItem={({ item }) => (
          <CountryRow
            item={item}
            selected={selected?.country === item.country}
            onSelect={(c) => {
              onSelect(c);
              setSearch('');
              onClose();
            }}
          />
        )}
        getItemLayout={(_, index) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * index,
          index,
        })}
        initialNumToRender={12}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text tone="muted" style={{ textAlign: 'center', padding: spacing.lg }}>
            No country found.
          </Text>
        }
      />
    </Sheet>
  );
}
