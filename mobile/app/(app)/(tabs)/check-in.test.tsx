/* eslint-disable @typescript-eslint/no-require-imports */
import { AccessibilityInfo, findNodeHandle } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

const mockFrames: FrameRequestCallback[] = [];
const mockFindNodeHandle = jest.mocked(findNodeHandle);
const mockAccessibilityInfo = jest.mocked(AccessibilityInfo);
const mockEmptyDraftForm = {
  morningWeight: null, sleepHours: null, workoutStatus: null, workoutPerformance: null,
  nutritionScore: null, calorieIntake: null, waterLiters: null, dailySteps: null,
  protein: null, carbs: null, fats: null, energyLevel: null, hungerLevel: null,
  stressLevel: null, digestion: null, notes: '',
};
const mockLoadDraft = jest.fn(async () => ({ form: mockEmptyDraftForm, step: 3 }));
const mockSaveDraft = jest.fn();
const mockClearDraft = jest.fn();

jest.mock('react-native', () => {
  const React = require('react');
  const MockView = 'View';
  const MockScrollView = React.forwardRef(
    ({ children }: { children: React.ReactNode }, _ref: unknown) =>
      React.createElement(MockView, null, children),
  );
  MockScrollView.displayName = 'MockScrollView';
  return {
    View: MockView,
    Text: 'Text',
    Pressable: 'Pressable',
    KeyboardAvoidingView: MockView,
    Platform: { OS: 'ios' },
    ScrollView: MockScrollView,
    findNodeHandle: jest.fn((node) => (node ? 44 : null)),
    AccessibilityInfo: {
      announceForAccessibility: jest.fn(),
      setAccessibilityFocus: jest.fn(),
    },
  };
});
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}), useRouter: () => ({ setParams: jest.fn() }) }));
jest.mock('date-fns', () => ({ format: () => 'Today' }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => ({ checkIns: [], processed: [], isLoading: false, isError: false, refetch: jest.fn() }),
}));
jest.mock('@/hooks/useCheckInDraft', () => ({
  useCheckInDraft: () => ({ saveDraft: mockSaveDraft, clearDraft: mockClearDraft, loadDraft: mockLoadDraft }),
}));
jest.mock('@/hooks/useCheckInMutation', () => ({
  findPreviousCheckIn: () => null,
  useCheckInMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock('@/lib/dates', () => ({ localDateString: () => '2026-08-30', parseLocalDate: () => new Date('2026-08-30') }));
jest.mock('@/lib/streak', () => ({ calculateStreak: () => 0 }));
jest.mock('@/types/db', () => ({ num: () => 0, normalizeWorkoutStatus: () => 'no' }));
jest.mock('@/theme', () => ({ ACTION_BAR_HEIGHT: 0, spacing: { xs: 4, sm: 8, base: 16, lg: 24 }, useMotion: () => ({ enabled: false }) }));
jest.mock('@/components/checkin/Celebration', () => ({ Celebration: () => null }));
jest.mock('@/components/checkin/CheckInForm', () => {
  const React = require('react');
  const { Pressable: MockPressable, Text: MockText, View: MockView } = require('react-native');
  const empty = {
    morningWeight: null, sleepHours: null, workoutStatus: null, workoutPerformance: null,
    nutritionScore: null, calorieIntake: null, waterLiters: null, dailySteps: null,
    protein: null, carbs: null, fats: null, energyLevel: null, hungerLevel: null,
    stressLevel: null, digestion: null, notes: '',
  };
  return {
    EMPTY_FORM: empty,
    fromRow: () => empty,
    prefillFrom: () => ({}),
    toPayload: (form: unknown) => form,
    SameAsYesterdayChip: () => null,
    CheckInForm: ({ step, errors, setForm }: { step: string; errors: Record<string, string>; setForm: (fn: (form: any) => any) => void }) => (
      <MockView>
        <MockText testID="active-step">{step}</MockText>
        <MockText testID="error-energy">{errors.energyLevel ?? ''}</MockText>
        <MockText testID="error-stress">{errors.stressLevel ?? ''}</MockText>
        <MockPressable testID="fix-energy" onPress={() => setForm((form) => ({ ...form, energyLevel: 7 }))} />
      </MockView>
    ),
  };
});
jest.mock('@/components/ui', () => {
  const { Pressable: MockPressable, Text: MockText, View: MockView } = require('react-native');
  return {
    Button: () => null,
    Card: ({ children }: { children: React.ReactNode }) => <MockView>{children}</MockView>,
    ErrorState: () => null,
    ProgressBar: () => null,
    Screen: ({ children }: { children: React.ReactNode }) => <MockView>{children}</MockView>,
    SkeletonCard: () => null,
    StickyActionBar: ({ onPrimary }: { onPrimary: () => void }) => <MockPressable testID="submit" onPress={onPrimary} />,
    Text: ({ children, ...props }: { children: React.ReactNode }) => <MockText {...props}>{children}</MockText>,
  };
});

// Load after the targeted React Native surface is registered.
const CheckInScreen = require('./check-in').default;

describe('CheckInScreen restored Finish validation', () => {
  beforeEach(() => {
    mockAccessibilityInfo.announceForAccessibility.mockClear();
    mockAccessibilityInfo.setAccessibilityFocus.mockClear();
    mockFindNodeHandle.mockClear();
    mockLoadDraft.mockClear();
    mockFrames.length = 0;
    global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      mockFrames.push(callback);
      return mockFrames.length;
    }) as typeof requestAnimationFrame;
  });

  it('returns a restored finish draft to its earliest invalid step, preserves unrelated errors, and focuses after layout', async () => {
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<CheckInScreen />, { createNodeMock: () => ({ mounted: true }) });
      await Promise.resolve();
    });
    expect(renderer.root.findByProps({ testID: 'active-step' }).props.children).toBe('finish');

    await act(async () => {
      await renderer.root.findByProps({ testID: 'submit' }).props.onPress();
    });

    expect(renderer.root.findByProps({ testID: 'active-step' }).props.children).toBe('readiness');
    expect(renderer.root.findByProps({ testID: 'error-energy' }).props.children).toBe('Choose your energy level.');
    expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Please complete the highlighted fields.');
    expect(mockAccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();

    act(() => mockFrames.splice(0).forEach((frame) => frame(0)));
    expect(mockFindNodeHandle).toHaveBeenCalledTimes(1);
    const [errorSummaryNode] = mockFindNodeHandle.mock.calls[0];
    expect(errorSummaryNode).not.toBeNull();
    expect(mockAccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(44);

    act(() => renderer.root.findByProps({ testID: 'fix-energy' }).props.onPress());
    expect(renderer.root.findByProps({ testID: 'error-energy' }).props.children).toBe('');
    expect(renderer.root.findByProps({ testID: 'error-stress' }).props.children).toBe('Choose your stress level.');
  });
});
