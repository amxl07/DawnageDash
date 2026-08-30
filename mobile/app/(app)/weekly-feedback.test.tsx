/* eslint-disable @typescript-eslint/no-require-imports */
import { Alert, AccessibilityInfo } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

const mockHistory = [
  {
    id: 'week-new',
    user_id: 'user-1',
    created_at: '2026-08-29T10:00:00.000Z',
    week_start_date: null,
    overall_feeling: 'Strong week',
    weekly_wins: 'Added five kilograms',
    nutrition_adherence: 'Mostly',
    digestion: null,
    enjoying_meals: 'Yes',
    hunger_levels: 'Mild hunger',
    nutrition_questions: null,
    training_progress: 'Yes',
    enjoying_training: 'Yes',
    missed_sessions: 'No',
    joint_pain: 'No',
    step_count: '8000',
    training_questions: null,
    recovery_issues: 'No',
    water_intake: '3',
    stress_level: '4',
    overall_experience: 'Recovered well',
    feedback: null,
    coach_reply: 'This undeclared field must never render',
  },
  {
    id: 'week-old',
    user_id: 'user-1',
    created_at: '2026-08-22T10:00:00.000Z',
    week_start_date: null,
    overall_feeling: 'Okay',
  },
];
let mockCheckIns: {
  daily_steps: number | null;
  water_liters: number | null;
  stress_level: number | null;
}[] = [];
let mockUser = { id: 'user-1', user_metadata: { full_name: 'Maya Singh' } };

const mockLoadDraft = jest.fn(async () => null);
const mockSaveDraft = jest.fn(async () => true);
const mockUser2SaveDraft = jest.fn(async () => true);
const mockClearDraft = jest.fn(async () => true);
const mockInsert = jest.fn(async () => ({ error: null as Error | null }));
const mockInvalidateQueries = jest.fn();
const mockRefetchHistory = jest.fn();
const mockDispatch = jest.fn();
const mockRouterBack = jest.fn();
const mockScrollTo = jest.fn();
let mockPreventRemoveEnabled = false;
let mockPreventRemoveCallback:
  | ((event: { data: { action: { type: string } } }) => void)
  | undefined;
let mockHistoryQuery: {
  data: typeof mockHistory | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: typeof mockRefetchHistory;
};
let mockDraftStatus = 'saved';
let mockMotionEnabled = true;

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ dispatch: mockDispatch }),
  usePreventRemove: (
    enabled: boolean,
    callback: (event: { data: { action: { type: string } } }) => void,
  ) => {
    mockPreventRemoveEnabled = enabled;
    mockPreventRemoveCallback = callback;
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockRouterBack, replace: jest.fn() }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => mockHistoryQuery,
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => ({ checkIns: mockCheckIns }),
}));

jest.mock('@/hooks/useWeeklyFeedbackDraft', () => ({
  useWeeklyFeedbackDraft: () => ({
    loadDraft: mockLoadDraft,
    saveDraft: mockUser.id === 'user-1' ? mockSaveDraft : mockUser2SaveDraft,
    clearDraft: mockClearDraft,
    draftStatus: mockDraftStatus,
  }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: () => ({ insert: mockInsert }) },
}));

jest.mock('@/components/coach/CoachBadge', () => ({ CoachBadge: () => null }));

jest.mock('lucide-react-native', () => ({
  Camera: () => null,
  CheckCircle2: () => null,
  Ruler: () => null,
}));

jest.mock('@/theme', () => ({
  ACTION_BAR_HEIGHT: 64,
  iconSize: { md: 20, xl: 40 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32 },
  useTheme: () => ({
    colors: {
      border: '#ddd',
      destructive: '#f00',
      foreground: '#111',
      mutedForeground: '#666',
      primary: '#00f',
      success: '#080',
    },
  }),
  useMotion: () => ({ enabled: mockMotionEnabled }),
}));

jest.mock('@/components/ui', () => {
  const React = require('react');
  const {
    Pressable: MockPressable,
    Text: MockText,
    TextInput: MockTextInput,
    View: MockView,
  } = require('react-native');

  const Screen = React.forwardRef(
    ({ children }: { children: React.ReactNode }, ref: React.ForwardedRef<unknown>) => {
      React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
      return <MockView>{children}</MockView>;
    },
  );
  Screen.displayName = 'MockScreen';

  return {
    AnimatedFlatList: ({
      data,
      renderItem,
      keyExtractor,
      ListHeaderComponent,
      ListEmptyComponent,
      ...props
    }: {
      data: typeof mockHistory;
      renderItem: (info: { item: (typeof mockHistory)[number]; index: number }) => React.ReactNode;
      keyExtractor: (item: (typeof mockHistory)[number]) => string;
      ListHeaderComponent: React.ReactNode;
      ListEmptyComponent?: React.ReactNode;
      initialNumToRender: number;
      windowSize: number;
    }) => (
      <MockView
        testID="weekly-history-list"
        accessibilityHint={data.map(keyExtractor).join(',')}
        {...props}
      >
        {ListHeaderComponent}
        {!data.length ? ListEmptyComponent : null}
        {data.map((item, index) => (
          <MockView key={keyExtractor(item)}>{renderItem({ item, index })}</MockView>
        ))}
      </MockView>
    ),
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <MockPressable accessibilityLabel={label} onPress={onPress} />
    ),
    Card: ({ children, ...props }: React.ComponentProps<typeof MockView>) => (
      <MockView {...props}>{children}</MockView>
    ),
    EmptyState: ({ title, message }: { title: string; message?: string }) => (
      <MockView>
        <MockText>{title}</MockText>
        {message ? <MockText>{message}</MockText> : null}
      </MockView>
    ),
    ErrorState: ({ onRetry }: { onRetry?: () => void }) => (
      <MockView>
        {onRetry ? (
          <MockPressable accessibilityRole="button" accessibilityLabel="Retry" onPress={onRetry} />
        ) : null}
      </MockView>
    ),
    Input: ({ label, value, onChangeText, error }: {
      label: string;
      value: string;
      onChangeText: (value: string) => void;
      error?: string;
    }) => (
      <MockView>
        <MockTextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} />
        {error ? <MockText testID={`error-${label}`}>{error}</MockText> : null}
      </MockView>
    ),
    OptionRow: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <MockPressable accessibilityLabel={label} onPress={onPress} />
    ),
    PageHeader: ({ title, onBack }: { title: string; onBack: () => void }) => (
      <MockView>
        <MockText>{title}</MockText>
        <MockPressable accessibilityLabel="Go back" onPress={onBack} />
      </MockView>
    ),
    ProgressBar: () => null,
    RatingRow: ({ onChange }: { onChange: (value: number) => void }) => (
      <MockPressable accessibilityLabel="Set stress to 4" onPress={() => onChange(4)} />
    ),
    Screen,
    SkeletonCard: () => null,
    StatusPill: ({ status }: { status: string }) => (
      <MockText testID="draft-status">{status}</MockText>
    ),
    StickyActionBar: ({
      status,
      primaryLabel,
      onPrimary,
      secondaryLabel,
      onSecondary,
    }: {
      status: React.ReactNode;
      primaryLabel: string;
      onPrimary: () => void;
      secondaryLabel?: string;
      onSecondary?: () => void;
    }) => (
      <MockView>
        {status}
        <MockPressable testID="primary-action" accessibilityLabel={primaryLabel} onPress={onPrimary} />
        {onSecondary ? (
          <MockPressable accessibilityLabel={secondaryLabel} onPress={onSecondary} />
        ) : null}
      </MockView>
    ),
    Text: ({ children, ...props }: React.ComponentProps<typeof MockText>) => (
      <MockText {...props}>{children}</MockText>
    ),
    useListMotion: () => ({ itemLayoutAnimation: undefined }),
  };
});

const WeeklyFeedbackScreen = require('./weekly-feedback').default;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function renderScreen() {
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(<WeeklyFeedbackScreen />, { createNodeMock: () => ({ mounted: true }) });
    await Promise.resolve();
  });
  return renderer;
}

async function press(renderer: ReturnType<typeof create>, label: string) {
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: label }).props.onPress();
  });
}

describe('WeeklyFeedbackScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadDraft.mockResolvedValue(null);
    mockSaveDraft.mockResolvedValue(true);
    mockUser2SaveDraft.mockResolvedValue(true);
    mockClearDraft.mockResolvedValue(true);
    mockInsert.mockResolvedValue({ error: null });
    mockCheckIns = [];
    mockUser = { id: 'user-1', user_metadata: { full_name: 'Maya Singh' } };
    mockHistoryQuery = {
      data: mockHistory,
      isLoading: false,
      isError: false,
      refetch: mockRefetchHistory,
    };
    mockDraftStatus = 'saved';
    mockMotionEnabled = true;
    mockPreventRemoveEnabled = false;
    mockPreventRemoveCallback = undefined;
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(jest.fn());
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(jest.fn());
  });

  afterEach(() => jest.restoreAllMocks());

  it('virtualizes history using stable server IDs and bounded render windows', async () => {
    const renderer = await renderScreen();
    const list = renderer.root.findByProps({ testID: 'weekly-history-list' });

    expect(list.props.accessibilityHint).toBe('week-new,week-old');
    expect(list.props.initialNumToRender).toBe(6);
    expect(list.props.windowSize).toBe(5);
    expect(renderer.root.findByProps({ accessibilityLabel: 'Start' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ children: 'This undeclared field must never render' })).toHaveLength(0);
  });

  it('blocks an invalid active step, renders its inline error, and announces the summary', async () => {
    const renderer = await renderScreen();
    await press(renderer, 'Start');
    await press(renderer, 'Next');
    await press(renderer, 'Next');

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: "What's your average step count this week?" })
        .props.onChangeText('-1');
    });
    await act(async () => renderer.root.findByProps({ testID: 'primary-action' }).props.onPress());

    expect(
      renderer.root.findByProps({
        testID: "error-What's your average step count this week?",
      }).props.children,
    ).toBe('Enter a step count of zero or more.');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Please correct the highlighted fields before continuing.',
    );
    expect(renderer.root.findByProps({ children: 'Training' })).toBeTruthy();
  });

  it('announces each newly opened step and exposes draft state beside the step count', async () => {
    const renderer = await renderScreen();
    await press(renderer, 'Start');
    await press(renderer, 'Next');

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Step 2 of 5: Nutrition',
    );
    expect(renderer.root.findByProps({ testID: 'draft-status' }).props.children).toBe('saved');
    expect(renderer.root.findByProps({ children: 'Step 2 of 5' })).toBeTruthy();
  });

  it('disables animated step and validation scrolling when Reduced Motion is enabled', async () => {
    mockMotionEnabled = false;
    const renderer = await renderScreen();
    await press(renderer, 'Start');
    mockScrollTo.mockClear();

    await press(renderer, 'Next');
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 0, animated: false });

    await press(renderer, 'Next');
    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: "What's your average step count this week?" })
        .props.onChangeText('-1');
    });
    mockScrollTo.mockClear();
    await act(async () => renderer.root.findByProps({ testID: 'primary-action' }).props.onPress());

    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 0, animated: false });
  });

  it('awaits a durable save before exit and remains on-screen when storage fails', async () => {
    mockSaveDraft.mockResolvedValue(false);
    const renderer = await renderScreen();
    await press(renderer, 'Start');
    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'How are you feeling overall this week?' })
        .props.onChangeText('Keep this response');
    });

    expect(mockPreventRemoveEnabled).toBe(true);
    act(() => mockPreventRemoveCallback?.({ data: { action: { type: 'GO_BACK' } } }));
    const actions = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? [];
    const saveAndExit = actions.find((action) => action.text === 'Save draft & exit');
    await act(async () => {
      await saveAndExit?.onPress?.();
    });

    expect(mockSaveDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({ overall_feeling: 'Keep this response' }),
      0,
      { immediate: true },
    );
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(
      renderer.root.findByProps({ children: 'Couldn’t save your draft. Keep editing and try again.' }),
    ).toBeTruthy();
  });

  it('retains answers after a network failure and changes the submit action to Retry', async () => {
    mockInsert
      .mockResolvedValueOnce({ error: new Error('offline') })
      .mockResolvedValueOnce({ error: null });
    const renderer = await renderScreen();
    await press(renderer, 'Start');
    await press(renderer, 'Next');
    await press(renderer, 'Next');
    await press(renderer, 'Next');
    await press(renderer, 'Next');

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'Anything else you want to share?' })
        .props.onChangeText('Please keep this');
    });
    await press(renderer, 'Submit');

    expect(renderer.root.findByProps({ accessibilityLabel: 'Anything else you want to share?' }).props.value)
      .toBe('Please keep this');
    expect(renderer.root.findByProps({ accessibilityLabel: 'Retry' })).toBeTruthy();

    await press(renderer, 'Retry');

    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(mockInsert.mock.calls[0]).toEqual(mockInsert.mock.calls[1]);
  });

  it('renders a shape-matched initial loading state', async () => {
    mockHistoryQuery = {
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mockRefetchHistory,
    };

    const renderer = await renderScreen();

    const loading = renderer.root.findByProps({ testID: 'progress-skeleton' });
    expect(loading.props.accessibilityLabel).toBe('Loading weekly check-in');
    expect(loading.props.accessibilityState).toEqual({ busy: true });
  });

  it('keeps the check-in action available when history loading fails and offers retry', async () => {
    mockHistoryQuery = {
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetchHistory,
    };
    const renderer = await renderScreen();

    expect(renderer.root.findByProps({ accessibilityLabel: 'Start' })).toBeTruthy();
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Retry' }).props.onPress());
    expect(mockRefetchHistory).toHaveBeenCalledTimes(1);
  });

  it('explains an empty history without hiding the first check-in action', async () => {
    mockHistoryQuery = {
      data: [],
      isLoading: false,
      isError: false,
      refetch: mockRefetchHistory,
    };
    const renderer = await renderScreen();

    expect(renderer.root.findByProps({ accessibilityLabel: 'Start' })).toBeTruthy();
    expect(
      renderer.root.findByProps({
        children: 'Your submitted weekly check-ins will appear here for easy review.',
      }),
    ).toBeTruthy();
  });

  it('preserves cached weekly history when its refresh fails', async () => {
    mockHistoryQuery = {
      data: mockHistory,
      isLoading: false,
      isError: true,
      refetch: mockRefetchHistory,
    };
    const renderer = await renderScreen();

    expect(renderer.root.findByProps({ children: 'Strong week' })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Retry' })).toBeTruthy();
  });

  it('shows draft failure status without replacing active answers', async () => {
    mockDraftStatus = 'error';
    const renderer = await renderScreen();
    await press(renderer, 'Start');

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'How are you feeling overall this week?' })
        .props.onChangeText('Still editing');
    });

    expect(renderer.root.findByProps({ testID: 'draft-status' }).props.children).toBe('error');
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'How are you feeling overall this week?' })
        .props.value,
    ).toBe('Still editing');
  });

  it('does not re-run restoration when daily-check-in prefill changes during active editing', async () => {
    mockCheckIns = [{ daily_steps: 5000, water_liters: 2, stress_level: 3 }];
    const renderer = await renderScreen();
    await press(renderer, 'Start');
    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'How are you feeling overall this week?' })
        .props.onChangeText('My in-progress answer');
    });
    await press(renderer, 'Next');

    mockCheckIns = [{ daily_steps: 9000, water_liters: 4, stress_level: 8 }];
    await act(async () => {
      renderer.update(<WeeklyFeedbackScreen />);
      await Promise.resolve();
    });

    expect(renderer.root.findByProps({ children: 'Nutrition' })).toBeTruthy();
    await press(renderer, 'Back');
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'How are you feeling overall this week?' })
        .props.value,
    ).toBe('My in-progress answer');
    expect(mockLoadDraft).toHaveBeenCalledTimes(1);
  });

  it('resets active flow state when the authenticated user changes', async () => {
    const renderer = await renderScreen();
    await press(renderer, 'Start');
    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'How are you feeling overall this week?' })
        .props.onChangeText('User one only');
    });
    await press(renderer, 'Next');

    mockUser = { id: 'user-2', user_metadata: { full_name: 'Noor Shah' } };
    await act(async () => {
      renderer.update(<WeeklyFeedbackScreen />);
      await Promise.resolve();
    });

    expect(mockPreventRemoveEnabled).toBe(false);
    expect(renderer.root.findByProps({ accessibilityLabel: 'Start' })).toBeTruthy();
    await press(renderer, 'Start');
    expect(renderer.root.findByProps({ children: 'Weekly Overview' })).toBeTruthy();
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'How are you feeling overall this week?' })
        .props.value,
    ).toBe('');
  });

  it('never autosaves the outgoing user form through the incoming user draft callback', async () => {
    const renderer = await renderScreen();
    await press(renderer, 'Start');
    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'How are you feeling overall this week?' })
        .props.onChangeText('Private answer owned by user one');
    });
    mockSaveDraft.mockClear();
    mockUser2SaveDraft.mockClear();

    mockUser = { id: 'user-2', user_metadata: { full_name: 'Noor Shah' } };
    await act(async () => {
      renderer.update(<WeeklyFeedbackScreen />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockUser2SaveDraft).not.toHaveBeenCalledWith(
      expect.objectContaining({ overall_feeling: 'Private answer owned by user one' }),
      expect.any(Number),
    );
    expect(mockUser2SaveDraft).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Start' })).toBeTruthy();
  });

  it('ignores a stale submit completion after the authenticated user changes', async () => {
    const insert = deferred<{ error: Error | null }>();
    mockInsert.mockReturnValueOnce(insert.promise);
    const renderer = await renderScreen();
    await press(renderer, 'Start');
    await press(renderer, 'Next');
    await press(renderer, 'Next');
    await press(renderer, 'Next');
    await press(renderer, 'Next');

    act(() => renderer.root.findByProps({ testID: 'primary-action' }).props.onPress());
    mockUser = { id: 'user-2', user_metadata: { full_name: 'Noor Shah' } };
    await act(async () => {
      renderer.update(<WeeklyFeedbackScreen />);
      await Promise.resolve();
    });
    await act(async () => insert.resolve({ error: null }));

    expect(renderer.root.findAllByProps({ children: 'Thanks, Noor!' })).toHaveLength(0);
    expect(renderer.root.findByProps({ accessibilityLabel: 'Start' })).toBeTruthy();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('ignores a stale exit-alert save after the authenticated user changes', async () => {
    const renderer = await renderScreen();
    await press(renderer, 'Start');
    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'How are you feeling overall this week?' })
        .props.onChangeText('User one answer');
    });
    mockSaveDraft.mockClear();
    const exitSave = deferred<boolean>();
    mockSaveDraft.mockReturnValueOnce(exitSave.promise);

    act(() => mockPreventRemoveCallback?.({ data: { action: { type: 'GO_BACK' } } }));
    const actions = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? [];
    const saveAndExit = actions.find((action) => action.text === 'Save draft & exit');
    act(() => {
      void saveAndExit?.onPress?.();
    });

    mockUser = { id: 'user-2', user_metadata: { full_name: 'Noor Shah' } };
    await act(async () => {
      renderer.update(<WeeklyFeedbackScreen />);
      await Promise.resolve();
    });
    await act(async () => exitSave.resolve(true));

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(
      renderer.root.findAllByProps({ children: 'Couldn’t save your draft. Keep editing and try again.' }),
    ).toHaveLength(0);
    expect(renderer.root.findByProps({ accessibilityLabel: 'Start' })).toBeTruthy();
  });

  it('retries only local cleanup after the server has accepted the submission', async () => {
    mockClearDraft.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const renderer = await renderScreen();
    await press(renderer, 'Start');
    await press(renderer, 'Next');
    await press(renderer, 'Next');
    await press(renderer, 'Next');
    await press(renderer, 'Next');

    await act(async () => {
      renderer.root.findByProps({ testID: 'primary-action' }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findByProps({
        children: 'Check-in sent, but its saved draft could not be cleared from this device.',
      }),
    ).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Retry cleanup' })).toBeTruthy();
    expect(mockPreventRemoveEnabled).toBe(true);

    await press(renderer, 'Retry cleanup');
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockClearDraft).toHaveBeenCalledTimes(2);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(renderer.root.findByProps({ children: 'Thanks, Maya!' })).toBeTruthy();
  });
});
