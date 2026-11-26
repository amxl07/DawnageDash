import { act, create } from 'react-test-renderer';

import NutritionScreen from '../../../../app/(app)/(tabs)/nutrition';
import type { Meal } from '@/hooks/usePlans';

const mockMealRefetch = jest.fn();
const mockProfileRefetch = jest.fn();
let mockMealError = false;
let mockMealMissing = false;
let mockProfileError = false;
let mockCalories = 2200;
let mockMeals: Meal[] = [];
let mockSupplements = [{ id: 'supp-1', name: 'Vitamin D', serving: '1 capsule', timing: 'Morning' }];
let mockProfileLoading = false;
let mockProfileMissing = false;
let mockSupplementPayload: string | null = null;

jest.mock('lucide-react-native', () => ({ Utensils: () => null }));
jest.mock('@/components/ui/DisclosureChevron', () => ({ DisclosureChevron: () => null }));
jest.mock('@/components/ui', () => {
  const native = jest.requireActual('react-native');
  return {
    Card: native.View,
    EmptyState: ({ title }: { title: string }) => <native.Text>{title}</native.Text>,
    ErrorState: ({ title, onRetry, retryLabel }: { title: string; onRetry: () => void; retryLabel: string }) => (
      <native.View>
        <native.Text>{title}</native.Text>
        <native.Pressable accessibilityLabel={retryLabel} onPress={onRetry} />
      </native.View>
    ),
    Screen: native.View,
    SkeletonCard: () => <native.View testID="nutrition-loading" />,
    Text: native.Text,
  };
});
jest.mock('@/hooks/usePlans', () => ({
  useMealPlan: () => ({
    data: mockMealMissing ? undefined : {
      pointer: { calories: mockCalories, dietType: 'vegetarian' },
      meals: mockMeals,
    },
    isLoading: false,
    isError: mockMealError,
    refetch: mockMealRefetch,
  }),
  useUserProfile: () => ({
    data: mockProfileMissing ? undefined : {
      supplements_data: mockSupplementPayload ?? JSON.stringify(mockSupplements),
      nutrition_note: 'Keep meals consistent.',
      cardio_note: 'Walk after lunch.',
      steps_note: null,
    },
    isLoading: mockProfileLoading,
    isError: mockProfileError,
    refetch: mockProfileRefetch,
  }),
}));
jest.mock('@/theme', () => ({
  ...jest.requireActual('@/theme/tokens'),
  spacing: { xs: 4, sm: 8, md: 12, lg: 24 },
  useTheme: () => ({ colors: { border: '#ddd' } }),
}));

function screenText(renderer: ReturnType<typeof create>) {
  return renderer.root.findAll((node) => typeof node.type === 'string')
    .map((node) => node.children.filter((child) => typeof child === 'string').join(''))
    .filter(Boolean).join('\n');
}

describe('Nutrition route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMealError = false;
    mockMealMissing = false;
    mockProfileError = false;
    mockProfileLoading = false;
    mockProfileMissing = false;
    mockSupplementPayload = null;
    mockSupplements = [{ id: 'supp-1', name: 'Vitamin D', serving: '1 capsule', timing: 'Morning' }];
    mockCalories = 2200;
    mockMeals = [{ meal_type: 'Breakfast', description: 'Oats', calories: 500, protein: 25, carbs: 70, fats: 12 }];
  });

  it('keeps meal targets, supplements and coach notes together', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    const text = screenText(renderer);
    expect(text).toContain('2200');
    expect(text).toContain('kcal / day');
    expect(text).toContain('vegetarian');
    expect(text).toContain('Breakfast');
    expect(text).not.toContain('Oats');
    expect(text).toContain('Vitamin D');
    expect(text).toContain('Keep meals consistent.');
    expect(text).not.toContain('Walk after lunch.');
  });

  it('omits the supplements section after a successful empty load', () => {
    mockSupplements = [];
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    expect(screenText(renderer)).not.toContain('Supplements');
    expect(screenText(renderer)).not.toContain('Nothing has been prescribed');
    expect(screenText(renderer)).toContain('Keep meals consistent.');
  });

  it('shows loading and retry states instead of treating unknown supplements as empty', () => {
    mockSupplements = [];
    mockProfileMissing = true;
    mockProfileLoading = true;
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    expect(renderer.root.findByProps({ testID: 'nutrition-loading' })).toBeTruthy();
    mockProfileLoading = false;
    mockProfileError = true;
    act(() => { renderer.update(<NutritionScreen />); });
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Retry profile' }).props.onPress());
    expect(mockProfileRefetch).toHaveBeenCalledTimes(1);
    expect(screenText(renderer)).not.toContain('Nothing has been prescribed');
  });

  it.each(['{invalid', '{}', '[null]'])('keeps a retry path for unreadable supplement data: %s', (payload) => {
    mockSupplements = [];
    mockSupplementPayload = payload;
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    expect(screenText(renderer)).toContain('Supplements couldn’t be read');
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Retry supplements' }).props.onPress());
    expect(mockProfileRefetch).toHaveBeenCalledTimes(1);
    expect(screenText(renderer)).not.toContain('Nothing has been prescribed');
  });

  it('keeps cached meal content visible and retries only the failed meal query', () => {
    mockMealError = true;
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    expect(renderer.root.findByProps({ children: 'Breakfast' })).toBeTruthy();
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Retry meal plan' }).props.onPress());
    expect(mockMealRefetch).toHaveBeenCalledTimes(1);
    expect(mockProfileRefetch).not.toHaveBeenCalled();
  });

  it('shows the existing no-plan state when no meal assignment is available', () => {
    mockMealMissing = true;
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    expect(renderer.root.findByProps({ children: 'No meal plan yet' })).toBeTruthy();
  });

  it('expands each prescribed meal independently while names and calories stay available', () => {
    mockMeals.push({ meal_type: 'Lunch', description: 'Rice and beans', calories: 700, protein: 30, carbs: 90, fats: 15 });
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    const breakfast = () => renderer.root.findByProps({ accessibilityLabel: 'Breakfast, 500 kcal' });
    const lunch = () => renderer.root.findByProps({ accessibilityLabel: 'Lunch, 700 kcal' });
    expect(breakfast().props.accessibilityRole).toBe('button');
    expect(breakfast().props.accessibilityState).toEqual({ expanded: false });
    expect(screenText(renderer)).not.toContain('Oats');

    act(() => breakfast().props.onPress());
    expect(breakfast().props.accessibilityState).toEqual({ expanded: true });
    expect(screenText(renderer)).toContain('Oats');
    expect(screenText(renderer)).toContain('Protein 25 g');
    expect(screenText(renderer)).not.toContain('Rice and beans');

    act(() => lunch().props.onPress());
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Nutrition details' }).props.onPress());
    expect(screenText(renderer)).toContain('Listed protein · 55 g');
    expect(breakfast().props.accessibilityState).toEqual({ expanded: true });
    expect(lunch().props.accessibilityState).toEqual({ expanded: true });
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Nutrition details' }).props.onPress());
    act(() => breakfast().props.onPress());
    expect(breakfast().props.accessibilityState).toEqual({ expanded: false });
    expect(lunch().props.accessibilityState).toEqual({ expanded: true });
    expect(screenText(renderer)).not.toContain('Oats');
    expect(screenText(renderer)).toContain('Rice and beans');
    expect(screenText(renderer)).not.toContain('Listed protein');
    expect(screenText(renderer)).toContain('Planned meals 1200 kcal');
  });

  it.each([
    [1700, 'Planned meals 2200 kcal', null],
    [1200, 'Planned meals 1700 kcal', '500 kcal below daily target'],
    [1900, 'Planned meals 2400 kcal', '200 kcal above daily target'],
  ])('compares a complete listed meal total with its prescribed target (%s kcal lunch)', (lunchCalories, total, comparison) => {
    mockMeals.push({ meal_type: 'Lunch', description: null, calories: lunchCalories, protein: 40, carbs: null, fats: null });
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    const details = () => renderer.root.findByProps({ accessibilityLabel: 'Nutrition details' });
    const text = screenText(renderer);
    expect(text).toContain(total);
    if (comparison) expect(text).toContain(comparison);
    else expect(text).not.toContain('Matches daily target');
    expect(text).not.toContain('Listed protein');
    expect(text).not.toContain('Your daily target is prescribed separately');
    expect(details().props.accessibilityRole).toBe('button');
    expect(details().props.accessibilityState).toEqual({ expanded: false });
    act(() => details().props.onPress());
    expect(details().props.accessibilityState).toEqual({ expanded: true });
    expect(screenText(renderer)).toContain('Listed protein · 65 g');
    if (lunchCalories !== 1700) {
      expect(screenText(renderer)).toContain('Confirm this difference with your coach.');
    }
    act(() => details().props.onPress());
    expect(details().props.accessibilityState).toEqual({ expanded: false });
    expect(screenText(renderer)).not.toContain('Listed protein');
    if (comparison) expect(screenText(renderer)).toContain(comparison);
  });

  it('keeps explicit zero separate from missing meal calories and macros', () => {
    mockMeals = [
      { meal_type: 'Breakfast', description: null, calories: 0, protein: 0, carbs: null, fats: 0 },
      { meal_type: 'Lunch', description: null, calories: null, protein: null, carbs: null, fats: null },
    ];
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    expect(renderer.root.findByProps({ accessibilityLabel: 'Breakfast, 0 kcal' })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Lunch, calories not listed' })).toBeTruthy();
    const text = screenText(renderer);
    expect(text).toContain('Planned meals 0 kcal (partial)');
    expect(text).not.toContain('Listed protein');
    expect(text).toContain('Calories missing for 1 of 2 meals');
    expect(text).not.toContain('below daily target');
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Nutrition details' }).props.onPress());
    expect(screenText(renderer)).toContain('Listed protein · 0 g (partial)');
    expect(screenText(renderer)).toContain('A full daily comparison isn’t available.');
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Breakfast, 0 kcal' }).props.onPress());
    expect(screenText(renderer)).toContain('No meal description listed.');
    expect(screenText(renderer)).toContain('Protein 0 g');
    expect(screenText(renderer)).toContain('Carbs not listed');
    expect(screenText(renderer)).toContain('Fat 0 g');
  });

  it('does not turn entirely missing meal amounts into zero totals', () => {
    mockMeals = [{ meal_type: 'Breakfast', description: null, calories: null, protein: null, carbs: null, fats: null }];
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    const text = screenText(renderer);
    expect(text).toContain('Meal calories not listed');
    expect(text).toContain('Calories missing for 1 of 1 meal');
    expect(text).not.toContain('Planned meals 0 kcal');
    expect(text).not.toContain('below daily target');
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Nutrition details' }).props.onPress());
    expect(screenText(renderer)).toContain('Meal protein not listed');
    expect(screenText(renderer)).not.toContain('Listed protein · 0 g');
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Breakfast, calories not listed' }).props.onPress());
    expect(screenText(renderer)).toContain('Macros not provided');
    expect(screenText(renderer)).not.toContain('Carbs not listed');
  });

  it('compares explicit zero meal amounts against an explicit zero target', () => {
    mockCalories = 0;
    mockMeals = [{ meal_type: 'Breakfast', description: null, calories: 0, protein: 0, carbs: 0, fats: 0 }];
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    expect(screenText(renderer)).toContain('Planned meals 0 kcal');
    expect(screenText(renderer)).not.toContain('Matches daily target');
    expect(screenText(renderer)).not.toContain('partial');
    expect(screenText(renderer)).not.toContain('not listed');
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Nutrition details' }).props.onPress());
    expect(screenText(renderer)).toContain('Listed protein · 0 g');
  });

  it('keeps a missing daily target visible without reporting a calorie difference', () => {
    mockCalories = Number.NaN;
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    const text = screenText(renderer);
    expect(text).toContain('Planned meals 500 kcal');
    expect(text).toContain('Not listed');
    expect(text).not.toContain('below daily target');
    expect(text).not.toContain('above daily target');
    expect(text).not.toContain('Matches daily target');
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Nutrition details' }).props.onPress());
    expect(screenText(renderer)).toContain('A daily calorie target hasn’t been listed for comparison.');
  });

  it('retains the target when its assigned plan has no listed meals', () => {
    mockMeals = [];
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    expect(screenText(renderer)).toContain('2200');
    expect(screenText(renderer)).toContain('No meal details listed yet.');
    expect(screenText(renderer)).not.toContain('Planned meals 0 kcal');
  });
});
