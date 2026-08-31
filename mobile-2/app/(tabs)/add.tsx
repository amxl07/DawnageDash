import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { StatusBanner } from '@/components/ui/status-banner';
import { formatDate } from '@/domain/date';
import type { Food } from '@/domain/models';
import { getInitialFoodQuantity, shouldClearFoodSelection } from '@/features/food/food-selection';
import { FoodSearchRow } from '@/features/food/food-search-row';
import { useAddFoodEntry, useFoodSearch } from '@/features/food/use-food-search';
import { useMealTypes } from '@/features/summary/summary-hooks';
import { useConnectionState } from '@/query/query-provider';
import { useSession } from '@/session/session-context';
import { useTheme } from '@/theme/theme';

export default function AddScreen() {
  const [term, setTerm] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [selectedMealId, setSelectedMealId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [formError, setFormError] = useState<string | null>(null);
  const searchQuery = useFoodSearch(term);
  const mealTypesQuery = useMealTypes();
  const addMutation = useAddFoodEntry();
  const { isOnline } = useConnectionState();
  const { session } = useSession();
  const { colors, radii, spacing } = useTheme();
  const connectedOffline = session?.mode === 'connected' && !isOnline;

  useEffect(() => {
    if (!selectedMealId && mealTypesQuery.data?.[0]) {
      setSelectedMealId(mealTypesQuery.data[0].id);
    }
  }, [mealTypesQuery.data, selectedMealId]);

  const submit = () => {
    const parsedQuantity = Number(quantity);
    if (!selectedFood) {
      setFormError('Choose a food before adding it.');
      return;
    }
    if (!selectedMealId) {
      setFormError('Choose a meal before adding it.');
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setFormError('Enter a quantity greater than zero.');
      return;
    }
    if (connectedOffline) {
      setFormError('Reconnect to add food to your connected diary.');
      return;
    }
    setFormError(null);
    addMutation.mutate({ date: formatDate(new Date()), foodId: selectedFood.id, mealTypeId: selectedMealId, quantity: parsedQuantity, unit: selectedFood.servingUnit, variantId: selectedFood.variantId }, {
      onError: (error) => setFormError(error instanceof Error ? error.message : 'We could not add that food.'),
      onSuccess: () => {
        setSelectedFood(null);
        setTerm('');
        setQuantity('1');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  };

  const updateSearchTerm = (nextTerm: string) => {
    if (shouldClearFoodSelection(term, nextTerm)) {
      setSelectedFood(null);
      setQuantity('1');
    }
    setTerm(nextTerm);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView contentContainerStyle={{ gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}><AppText variant="title">Quick log</AppText><AppText tone="muted">Find a food, choose the meal, and keep moving.</AppText></View>
        {connectedOffline ? <StatusBanner>Reconnect to add food to your connected diary.</StatusBanner> : null}
        {formError ? <StatusBanner tone="danger">{formError}</StatusBanner> : null}
        <View style={{ gap: 8 }}>
          <AppText style={{ fontWeight: '700' }}>Search food</AppText>
          <TextInput accessibilityLabel="Search foods" autoCapitalize="none" onChangeText={updateSearchTerm} placeholder="Try oats, yogurt, salmon…" placeholderTextColor={colors.muted} returnKeyType="search" style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 48, paddingHorizontal: 16 }} value={term} />
          {term.trim().length > 0 && term.trim().length < 2 ? <AppText tone="muted" variant="caption">Enter at least two characters to search.</AppText> : null}
          {searchQuery.isFetching ? <AppText tone="muted">Searching…</AppText> : null}
          {searchQuery.isError ? <StatusBanner tone="danger">Food search failed. Try again when you’re connected.</StatusBanner> : null}
          {term.trim().length >= 2 && !searchQuery.isFetching && searchQuery.data?.items.length === 0 ? <AppText tone="muted">No foods found. Try a broader search.</AppText> : null}
          {searchQuery.data?.items.map((food) => <FoodSearchRow food={food} isSelected={selectedFood?.id === food.id} key={food.variantId} onPress={() => { setSelectedFood(food); setQuantity(getInitialFoodQuantity(food)); setFormError(null); }} />)}
        </View>
        <View style={{ gap: 8 }}>
          <AppText style={{ fontWeight: '700' }}>Meal</AppText>
          {mealTypesQuery.isLoading ? <AppText tone="muted">Loading meal choices…</AppText> : null}
          {mealTypesQuery.isError ? <StatusBanner tone="danger">Meal choices are unavailable. Pull to refresh later.</StatusBanner> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {mealTypesQuery.data?.map((mealType) => {
              const selected = mealType.id === selectedMealId;
              return <Pressable accessibilityLabel={`Log to ${mealType.name}`} accessibilityRole="radio" accessibilityState={{ selected }} key={mealType.id} onPress={() => setSelectedMealId(mealType.id)} style={({ pressed }) => ({ alignItems: 'center', backgroundColor: selected ? colors.accent : colors.surface, borderColor: selected ? colors.accent : colors.border, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', minHeight: 44, opacity: pressed ? 0.72 : 1, paddingHorizontal: 16 })}><AppText tone={selected ? 'inverse' : 'default'} variant="caption">{mealType.name}</AppText></Pressable>;
            })}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <AppText style={{ fontWeight: '700' }}>Quantity {selectedFood ? `(${selectedFood.servingUnit})` : ''}</AppText>
          <TextInput accessibilityLabel="Food quantity" inputMode="decimal" keyboardType="decimal-pad" onChangeText={setQuantity} selectTextOnFocus style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 48, paddingHorizontal: 16 }} value={quantity} />
        </View>
        <AppButton accessibilityLabel="Add selected food" disabled={connectedOffline || mealTypesQuery.isLoading} loading={addMutation.isPending} onPress={submit}>Add to diary</AppButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
