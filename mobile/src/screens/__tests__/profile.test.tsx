import { Alert, StyleSheet, Text as NativeText, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { act, create } from 'react-test-renderer';

import ProfileScreen from '../../../app/(app)/profile';
import { prepareProfileSave, readProfileSaveRecovery, type ProfileForm } from '@/features/profile/profileSaveRecovery';

const MockNativeText = NativeText;
const MockView = View;
const MockPressable = jest.requireActual('react-native').Pressable;
const MockInput = ({ label }: { label: string; onChangeText?: (value: string) => void }) => (
  <MockNativeText>{label}</MockNativeText>
);
const mockAuthUpdateUser = jest.fn(async () => ({ error: null as Error | null }));
const mockUsersRead = jest.fn(async () => ({
  data: { profile_data: {} as Record<string, unknown> } as { profile_data: Record<string, unknown> } | null,
  error: null as Error | null,
}));
type MockMutationReceipt = { data?: Record<string, unknown> | null; error: Error | null };
function mockSelectedMutation(result: Promise<MockMutationReceipt>, savedRow: Record<string, unknown>) {
  const receipt = result.then((value) => ({ ...value, data: value.data === undefined ? savedRow : value.data }));
  // Supabase's filtered mutation is thenable both before and after selecting a receipt.
  return Object.assign(receipt, { select: (_fields: string) => ({ single: () => receipt }) });
}
const mockUsersUpdateEq = jest.fn(async (_field: string, _id: string): Promise<MockMutationReceipt> => ({ error: null }));
const mockUsersUpdate = jest.fn((payload: Record<string, unknown>) => ({
  eq: (field: string, id: string) => mockSelectedMutation(mockUsersUpdateEq(field, id), { id, ...payload }),
}));
const mockQuestionnaireRead = jest.fn(async () => ({
  data: null as Record<string, unknown> | null,
  error: null as Error | null,
}));
const mockQuestionnaireUpdateEq = jest.fn(async (_field: string, _id: string): Promise<MockMutationReceipt> => ({ error: null }));
const mockQuestionnaireUserFilter = jest.fn();
const mockQuestionnaireUpdate = jest.fn((payload: { answers: string }) => ({
  eq: (field: string, userId: string) => {
    mockQuestionnaireUserFilter(field, userId);
    return {
      eq: (rowField: string, rowId: string) => mockSelectedMutation(
        mockQuestionnaireUpdateEq(rowField, rowId), { id: rowId, user_id: userId, ...payload },
      ),
    };
  },
}));
const mockResponsiveLayout = jest.fn(() => ({ isCompact: true }));
const mockRouterBack = jest.fn();
const mockSignOut = jest.fn();
const mockDispatch = jest.fn();
const mockInvalidate = jest.fn();
const mockStorage = new Map<string, string>();
let mockUser = { id: 'user-1', email: 'maya@example.com' };
let mockPrevented = false;
let mockProfileError = false;
let mockOnRemove: (event: { data: { action: unknown } }) => void;
let mockProfile = {
  id: 'user-1',
  full_name: 'Maya Singh',
  email: 'maya@example.com',
  phone_number: null,
  country: null,
  profile_data: {} as Record<string, unknown>,
  package_start_date: '2026-08-01',
  package_duration: 3,
};

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
  removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
}));
jest.mock('expo-router/react-navigation', () => ({
  useNavigation: () => ({ dispatch: mockDispatch }),
  usePreventRemove: (prevent: boolean, callback: typeof mockOnRemove) => {
    mockPrevented = prevent;
    mockOnRemove = callback;
  },
}));
jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockRouterBack }), useLocalSearchParams: () => ({}) }));
jest.mock('lucide-react-native', () => ({ ChevronDown: () => null, Clock: () => null }));
jest.mock('@/components/auth/CountryPicker', () => ({ CountryPicker: () => null }));
jest.mock('@/components/onboarding/TimezonePicker', () => ({ TimezonePicker: () => null }));
jest.mock('@/components/questionnaire', () => ({ QuestionnaireWizard: () => null }));
jest.mock('@/components/ui', () => ({
  Button: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => (
    <MockPressable accessibilityLabel={label} disabled={disabled} onPress={onPress}>
      <MockNativeText>{label}</MockNativeText>
    </MockPressable>
  ),
  Card: ({ children, ...props }: React.ComponentProps<typeof MockView>) => (
    <MockView {...props}>{children}</MockView>
  ),
  Input: (props: React.ComponentProps<typeof MockInput>) => <MockInput {...props} />,
  PageHeader: ({ title, onBack }: { title: string; onBack?: () => void }) => (
    <MockPressable accessibilityLabel="Back from profile" onPress={onBack}>
      <MockNativeText>{title}</MockNativeText>
    </MockPressable>
  ),
  Screen: ({ children, ...props }: React.ComponentProps<typeof MockView>) => (
    <MockView testID="profile-screen" {...props}>
      {children}
    </MockView>
  ),
  SegmentedControl: ({ segments, onChange }: { segments: { value: string; label: string }[]; onChange: (value: string) => void }) => (
    <MockView testID="profile-tabs" accessibilityLabel={segments.map((item) => item.label).join(', ')}>
      {segments.map((item) => (
        <MockPressable key={item.value} accessibilityLabel={`Open ${item.label}`} onPress={() => onChange(item.value)} />
      ))}
    </MockView>
  ),
  SkeletonCard: () => null,
  ErrorState: ({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) => (
    <MockView><MockNativeText>{title}</MockNativeText><MockNativeText>{message}</MockNativeText>
      <MockPressable accessibilityLabel="Retry profile load" onPress={onRetry} />
    </MockView>
  ),
  Text: ({ children, ...props }: React.ComponentProps<typeof MockNativeText>) => (
    <MockNativeText {...props}>{children}</MockNativeText>
  ),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, signOut: mockSignOut }),
}));
jest.mock('@/hooks/useCoach', () => ({
  useCoach: () => ({ data: { kind: 'unavailable' } }),
  coachInitials: () => '—',
}));
jest.mock('@/hooks/usePlans', () => ({
  useUserProfile: () => ({
    isLoading: false,
    isError: mockProfileError,
    data: mockProfile,
  }),
}));
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => mockResponsiveLayout(),
}));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { updateUser: (...args: unknown[]) => (mockAuthUpdateUser as jest.Mock)(...args) },
    from: (table: string) =>
      table === 'users'
        ? {
            select: () => ({ eq: () => ({ maybeSingle: mockUsersRead }) }),
            update: mockUsersUpdate,
          }
        : {
            select: () => ({ eq: () => ({ maybeSingle: mockQuestionnaireRead }) }),
            update: mockQuestionnaireUpdate,
          },
  },
}));
jest.mock('@/lib/timezones', () => ({ detectTimezone: () => 'Asia/Kolkata' }));
jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { md: 20 },
  radius: { card: 20, md: 12, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24 },
  useTheme: () => ({
    colors: {
      border: '#ddd',
      borderStrong: '#bbb',
      card: '#fff',
      elevated: '#eee',
      mutedForeground: '#666',
    },
  }),
}));

const mountedRenderers = new Set<ReturnType<typeof create>>();

async function renderScreen() {
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(<ProfileScreen />);
    mountedRenderers.add(renderer);
    await Promise.resolve();
  });
  return renderer;
}

type Renderer = Awaited<ReturnType<typeof renderScreen>>;
const recoveryForm: ProfileForm = { name: 'Maya Singh', phone: '', country: '', timezone: 'Asia/Kolkata', goal: 'Strength', injuries: 'Knee', allergies: 'Peanuts', workoutDays: '3-4 days', medicalCondition: '' };
const assessmentRow = { id: 'assessment-1', answers: JSON.stringify({ q14: 'Old goal', q56: 'Old injury', q64: 'Old allergy', q33: '1-2 days', q1: 'keep latest' }), completed_sections: JSON.stringify(['identity', 'future-section']) };
const canonicalProfile = (form: ProfileForm) => ({ full_name: form.name, phone_number: form.phone, country: form.country, profile_data: { timezone: form.timezone, goal: form.goal, injuries: form.injuries, allergies: form.allergies, workoutDays: form.workoutDays, medicalCondition: form.medicalCondition, primary_goal: 'performance' } });
function input(renderer: Renderer, label: string) {
  return renderer.root.findAllByType(MockInput).find((node) => node.props.label === label)!;
}
function edit(renderer: Renderer, label: string, value: string) { act(() => input(renderer, label).props.onChangeText(value)); }
async function press(renderer: Renderer, label: string) { await act(async () => { await renderer.root.findByProps({ accessibilityLabel: label }).props.onPress(); }); }
function visible(renderer: Renderer, phrase: string) { return renderer.root.findAllByType(MockNativeText).some((node) => String(node.props.children).includes(phrase)); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockUser = { id: 'user-1', email: 'maya@example.com' };
    mockPrevented = false;
    mockProfileError = false;
    jest.mocked(AsyncStorage.setItem).mockReset().mockImplementation(async (key, value) => { mockStorage.set(key, value); });
    jest.mocked(AsyncStorage.removeItem).mockReset().mockImplementation(async (key) => { mockStorage.delete(key); });
    mockProfile = {
      id: 'user-1',
      full_name: 'Maya Singh',
      email: 'maya@example.com',
      phone_number: null,
      country: null,
      profile_data: {},
      package_start_date: '2026-08-01',
      package_duration: 3,
    };
    mockAuthUpdateUser.mockReset().mockResolvedValue({ error: null });
    mockUsersRead.mockReset().mockResolvedValue({ data: { profile_data: {} }, error: null });
    mockUsersUpdateEq.mockReset().mockResolvedValue({ error: null });
    mockQuestionnaireRead.mockReset().mockResolvedValue({ data: null, error: null });
    mockQuestionnaireUpdateEq.mockReset().mockResolvedValue({ error: null });
    mockResponsiveLayout.mockReturnValue({ isCompact: true });
  });

  afterEach(() => {
    act(() => {
      for (const renderer of mountedRenderers) renderer.unmount();
    });
    mountedRenderers.clear();
  });

  it('keeps coach status and both profile sections visible', async () => {
    const renderer = await renderScreen();

    expect(
      renderer.root
        .findAllByType(MockNativeText)
        .some((node: { props: { children?: React.ReactNode } }) =>
          String(node.props.children).includes('Coach details are temporarily unavailable.'),
        ),
    ).toBe(true);
    expect(renderer.root.findByProps({ testID: 'profile-tabs' }).props.accessibilityLabel).toBe(
      'Basic details, Assessment',
    );
    expect(
      renderer.root.findAll(
        (node: { type?: unknown; props: { testID?: string } }) =>
          node.type === MockView && node.props.testID === 'profile-screen',
      ),
    ).toHaveLength(1);
  });

  it('stacks program dates in compact and large-text mode', async () => {
    const renderer = await renderScreen();

    expect(StyleSheet.flatten(renderer.root.findByProps({ testID: 'program-start-row' }).props.style)).toMatchObject({
      flexDirection: 'column',
      alignItems: 'flex-start',
    });
    expect(StyleSheet.flatten(renderer.root.findByProps({ testID: 'program-end-row' }).props.style)).toMatchObject({
      flexDirection: 'column',
      alignItems: 'flex-start',
    });
  });

  it('merges changed fields into the latest profile JSON and preserves assessment data', async () => {
    mockUsersRead.mockResolvedValue({
      data: {
        profile_data: {
          primary_goal: 'performance',
          timezone: 'America/Los_Angeles',
          custom: 9,
        },
      },
      error: null,
    });
    mockQuestionnaireRead
      .mockResolvedValueOnce({
        data: { answers: JSON.stringify({ q14: 'old goal', q1: 'keep me' }) },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 'assessment-1',
          answers: JSON.stringify({ q14: 'latest goal', q1: 'keep me' }),
          completed_sections: JSON.stringify(['identity']),
        },
        error: null,
      });
    const renderer = await renderScreen();

    act(() =>
      renderer.root
        .findAllByType(MockInput)
        .find((node: { props: { label?: string; onChangeText?: (value: string) => void } }) => node.props.label === 'Goal')
        ?.props.onChangeText('new goal'),
    );
    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: 'Save changes' }).props.onPress();
    });

    expect(mockUsersUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_data: expect.objectContaining({
          primary_goal: 'performance',
          custom: 9,
          goal: 'new goal',
        }),
      }),
    );
    expect(mockQuestionnaireUpdate).toHaveBeenCalledWith({
      answers: JSON.stringify({ q14: 'new goal', q1: 'keep me', q56: '', q64: '', q33: '' }),
    });
    expect(mockQuestionnaireUpdateEq).toHaveBeenCalledWith('id', 'assessment-1');
    expect(mockQuestionnaireUserFilter).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('does not write profile JSON when the latest-row fetch fails', async () => {
    mockUsersRead.mockResolvedValue({ data: null, error: new Error('offline') });
    const renderer = await renderScreen();

    act(() =>
      renderer.root
        .findAllByType(MockInput)
        .find((node: { props: { label?: string; onChangeText?: (value: string) => void } }) => node.props.label === 'Goal')
        ?.props.onChangeText('new goal'),
    );
    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: 'Save changes' }).props.onPress();
    });

    expect(mockUsersUpdate).not.toHaveBeenCalled();
    expect(
      renderer.root
        .findAllByType(MockNativeText)
        .some((node: { props: { children?: React.ReactNode } }) => String(node.props.children).includes("Couldn't save")),
    ).toBe(true);
  });

  it.each(['missing', 'values', 'account'])('requires a positive users receipt before acknowledging a save (%s)', async (failure) => {
    mockQuestionnaireRead.mockResolvedValue({ data: assessmentRow, error: null });
    const intended: ProfileForm = { name: 'Maya Singh', phone: '', country: '', timezone: 'Asia/Kolkata', goal: 'Wanted goal', injuries: 'Old injury', allergies: 'Old allergy', workoutDays: '1-2 days', medicalCondition: '' };
    const receipt = failure === 'missing' ? null : {
      id: failure === 'account' ? 'user-2' : 'user-1',
      ...canonicalProfile({ ...intended, goal: failure === 'values' ? 'Old goal' : intended.goal }),
    };
    mockUsersUpdateEq.mockResolvedValueOnce({ data: receipt, error: null });
    const renderer = await renderScreen();
    edit(renderer, 'Goal', 'Wanted goal');
    await press(renderer, 'Save changes');

    expect((await readProfileSaveRecovery('user-1'))).toMatchObject({ phase: 'prepared', form: { goal: 'Wanted goal' } });
    expect(mockQuestionnaireUpdate).not.toHaveBeenCalled();
    expect(input(renderer, 'Goal').props).toMatchObject({ value: 'Wanted goal', editable: true });
    expect(renderer.root.findByProps({ accessibilityLabel: 'Save changes' }).props.disabled).toBe(false);
    expect(visible(renderer, 'not confirmed saved')).toBe(true);

    await press(renderer, 'Save changes');
    expect(mockUsersUpdate).toHaveBeenCalledTimes(2);
    expect(mockQuestionnaireUpdate).toHaveBeenCalledTimes(1);
    expect(await readProfileSaveRecovery('user-1')).toBeNull();
  });

  it.each(['missing', 'values', 'row', 'account'])('requires a positive assessment receipt before clearing recovery (%s)', async (failure) => {
    mockQuestionnaireRead.mockResolvedValue({ data: assessmentRow, error: null });
    const receipt = failure === 'missing' ? null : {
      id: failure === 'row' ? 'other-assessment' : 'assessment-1',
      user_id: failure === 'account' ? 'user-2' : 'user-1',
      answers: JSON.stringify({ q14: failure === 'values' ? 'Old goal' : 'Wanted goal', q56: 'Old injury', q64: 'Old allergy', q33: '1-2 days', q1: 'keep latest' }),
    };
    mockQuestionnaireUpdateEq.mockResolvedValueOnce({ data: receipt, error: null });
    const renderer = await renderScreen();
    edit(renderer, 'Goal', 'Wanted goal');
    await press(renderer, 'Save changes');

    expect((await readProfileSaveRecovery('user-1'))).toMatchObject({ phase: 'profile-saved', form: { goal: 'Wanted goal' } });
    expect(input(renderer, 'Goal').props.value).toBe('Wanted goal');
    expect(visible(renderer, 'assessment sync failed')).toBe(true);
    await press(renderer, 'Retry assessment sync');
    expect(mockAuthUpdateUser).toHaveBeenCalledTimes(1);
    expect(mockUsersUpdate).toHaveBeenCalledTimes(1);
    expect(mockQuestionnaireUpdate).toHaveBeenCalledTimes(2);
    expect(await readProfileSaveRecovery('user-1')).toBeNull();
  });

  it('retries only assessment sync after the profile row was saved', async () => {
    mockQuestionnaireRead
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          id: 'assessment-1',
          answers: JSON.stringify({ q1: 'keep me' }),
          completed_sections: JSON.stringify(['identity']),
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 'assessment-1',
          answers: JSON.stringify({ q1: 'keep me' }),
          completed_sections: JSON.stringify(['identity']),
        },
        error: null,
      });
    mockQuestionnaireUpdateEq
      .mockResolvedValueOnce({ error: new Error('assessment unavailable') })
      .mockResolvedValueOnce({ error: null });
    const renderer = await renderScreen();

    act(() =>
      renderer.root
        .findAllByType(MockInput)
        .find((node: { props: { label?: string; onChangeText?: (value: string) => void } }) => node.props.label === 'Goal')
        ?.props.onChangeText('new goal'),
    );
    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: 'Save changes' }).props.onPress();
    });

    expect(
      renderer.root
        .findAllByType(MockNativeText)
        .some((node: { props: { children?: React.ReactNode } }) =>
          String(node.props.children).includes('Profile details were saved, but assessment sync failed'),
        ),
    ).toBe(true);
    expect(mockUsersUpdate).toHaveBeenCalledTimes(1);

    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: 'Retry assessment sync' }).props.onPress();
    });

    expect(mockAuthUpdateUser).toHaveBeenCalledTimes(1);
    expect(mockUsersRead).toHaveBeenCalledTimes(1);
    expect(mockUsersUpdate).toHaveBeenCalledTimes(1);
    expect(mockQuestionnaireUpdate).toHaveBeenCalledTimes(2);
  });

  it('guards navigation after a partial save with retry and leave-anyway actions', async () => {
    mockQuestionnaireRead
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          id: 'assessment-1',
          answers: JSON.stringify({ q1: 'keep me' }),
          completed_sections: JSON.stringify(['identity']),
        },
        error: null,
      });
    mockQuestionnaireUpdateEq.mockResolvedValueOnce({ error: new Error('assessment unavailable') });
    const alert = jest.spyOn(Alert, 'alert');
    const renderer = await renderScreen();

    act(() =>
      renderer.root
        .findAllByType(MockInput)
        .find((node: { props: { label?: string; onChangeText?: (value: string) => void } }) => node.props.label === 'Goal')
        ?.props.onChangeText?.('new goal'),
    );
    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: 'Save changes' }).props.onPress();
    });

    act(() => renderer.root.findByProps({ accessibilityLabel: 'Back from profile' }).props.onPress());
    const backOptions = alert.mock.calls.at(-1)?.[2] ?? [];
    expect(backOptions.map((option) => option.text)).toEqual([
      'Stay here',
      'Retry sync',
      'Leave anyway',
    ]);
    expect(mockRouterBack).not.toHaveBeenCalled();

    act(() => renderer.root.findByProps({ accessibilityLabel: 'Open Assessment' }).props.onPress());
    expect(alert).toHaveBeenCalledTimes(2);
    expect(renderer.root.findByProps({ accessibilityLabel: 'Retry assessment sync' })).toBeTruthy();

    act(() => backOptions[2]?.onPress?.());
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it.each([new Error('offline'), 'malformed'])('blocks failed assessment hydration and retries without erasing real answers (%s)', async (failure) => {
    mockQuestionnaireRead.mockResolvedValueOnce(failure instanceof Error
      ? { data: null, error: failure }
      : { data: { answers: '{broken' }, error: null });
    const renderer = await renderScreen();
    expect(visible(renderer, "Couldn't load your profile")).toBe(true);
    expect(renderer.root.findAllByType(MockInput)).toHaveLength(0);
    expect(mockUsersUpdate).not.toHaveBeenCalled();
    mockQuestionnaireRead.mockResolvedValue({ data: assessmentRow, error: null });
    await press(renderer, 'Retry profile load');
    edit(renderer, 'Full name', 'Maya Updated');
    await press(renderer, 'Save changes');
    expect(JSON.parse(mockQuestionnaireUpdate.mock.calls[0][0].answers)).toEqual({ q14: 'Old goal', q56: 'Old injury', q64: 'Old allergy', q33: '1-2 days', q1: 'keep latest' });
  });

  it('keeps an acknowledged assessment retry through unmount and uses only its overlap values', async () => {
    mockQuestionnaireRead.mockResolvedValue({ data: assessmentRow, error: null });
    mockQuestionnaireUpdateEq.mockResolvedValueOnce({ error: new Error('offline') });
    let renderer = await renderScreen();
    edit(renderer, 'Goal', 'Strength');
    await press(renderer, 'Save changes');
    expect((await readProfileSaveRecovery('user-1'))?.phase).toBe('profile-saved');
    act(() => renderer.unmount());
    mockProfile = { ...mockProfile, full_name: 'New server name', profile_data: { goal: 'Strength', injuries: 'unrelated profile fallback' } };
    mockUsersRead.mockResolvedValue({ data: { ...mockProfile }, error: null });
    renderer = await renderScreen();
    expect(input(renderer, 'Goal').props.value).toBe('Strength');
    expect(input(renderer, 'Full name').props.value).toBe('New server name');
    mockQuestionnaireRead.mockResolvedValue({ data: { ...assessmentRow, answers: JSON.stringify({ q1: 'changed later', q88: 7 }) }, error: null });
    await press(renderer, 'Retry assessment sync');
    expect(mockAuthUpdateUser).toHaveBeenCalledTimes(1);
    expect(mockUsersUpdate).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockQuestionnaireUpdate.mock.calls.at(-1)![0].answers)).toEqual({ q1: 'changed later', q88: 7, q14: 'Strength', q56: 'Old injury', q64: 'Old allergy', q33: '1-2 days' });
    expect(mockQuestionnaireUpdate.mock.calls.at(-1)![0]).not.toHaveProperty('completed_sections');
    expect(await readProfileSaveRecovery('user-1')).toBeNull();
  });

  it.each([false, true])('recovers prepared intent truthfully across the users acknowledgment boundary (%s)', async (committed) => {
    await prepareProfileSave('user-1', recoveryForm);
    mockQuestionnaireRead.mockResolvedValue({ data: assessmentRow, error: null });
    mockUsersRead.mockResolvedValue({ data: committed ? canonicalProfile(recoveryForm) : { ...mockProfile }, error: null });
    const renderer = await renderScreen();
    expect(input(renderer, 'Goal').props.value).toBe('Strength');
    if (committed) {
      await press(renderer, 'Retry assessment sync');
      expect(mockAuthUpdateUser).not.toHaveBeenCalled();
      expect(mockUsersUpdate).not.toHaveBeenCalled();
    } else {
      expect(visible(renderer, 'not confirmed saved')).toBe(true);
      expect(renderer.root.findByProps({ accessibilityLabel: 'Save changes' }).props.disabled).toBe(false);
      await press(renderer, 'Save changes');
      expect(mockUsersUpdate).toHaveBeenCalledTimes(1);
    }
    expect(await readProfileSaveRecovery('user-1')).toBeNull();
  });

  it('keeps the editor and blocks remote writes when preparing local recovery fails', async () => {
    const renderer = await renderScreen();
    edit(renderer, 'Goal', 'Must survive');
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk unavailable'));
    await press(renderer, 'Save changes');
    expect(mockAuthUpdateUser).not.toHaveBeenCalled();
    expect(mockUsersUpdate).not.toHaveBeenCalled();
    expect(input(renderer, 'Goal').props.value).toBe('Must survive');
    expect(visible(renderer, 'on this device')).toBe(true);
    expect(mockPrevented).toBe(true);
  });

  it('retains prepared recovery after users acknowledgment when the phase write fails', async () => {
    mockQuestionnaireRead.mockResolvedValue({ data: assessmentRow, error: null });
    let renderer = await renderScreen();
    edit(renderer, 'Goal', 'Strength');
    jest.mocked(AsyncStorage.setItem)
      .mockImplementationOnce(async (key, value) => { mockStorage.set(key, value); })
      .mockRejectedValueOnce(new Error('disk unavailable'));
    await press(renderer, 'Save changes');
    expect((await readProfileSaveRecovery('user-1'))?.phase).toBe('prepared');
    expect(renderer.root.findByProps({ accessibilityLabel: 'Retry assessment sync' })).toBeTruthy();
    expect(mockQuestionnaireUpdate).not.toHaveBeenCalled();
    const savedForm = (await readProfileSaveRecovery('user-1'))!.form;
    act(() => renderer.unmount());
    mockUsersRead.mockResolvedValue({ data: canonicalProfile(savedForm), error: null });
    renderer = await renderScreen();
    await press(renderer, 'Retry assessment sync');
    expect(mockUsersUpdate).toHaveBeenCalledTimes(1);
    expect(mockAuthUpdateUser).toHaveBeenCalledTimes(1);
  });

  it('does not replace active edits when the profile cache refreshes', async () => {
    const renderer = await renderScreen();
    edit(renderer, 'Goal', 'My active edit');
    mockProfile = { ...mockProfile, full_name: 'Refetched', profile_data: { goal: 'stale' } };
    await act(async () => { renderer.update(<ProfileScreen />); });
    expect(input(renderer, 'Goal').props.value).toBe('My active edit');
    expect(renderer.root.findByProps({ accessibilityLabel: 'Save changes' }).props.disabled).toBe(false);
  });

  it('keeps dirty edits and exit protection after a failed background profile refresh', async () => {
    const renderer = await renderScreen();
    edit(renderer, 'Goal', 'Still editing');
    mockProfileError = true;
    await act(async () => { renderer.update(<ProfileScreen />); });
    expect(input(renderer, 'Goal')?.props.value).toBe('Still editing');
    expect(mockPrevented).toBe(true);
  });

  it('keeps newer draft edits when a prepared save is later confirmed on the server', async () => {
    await prepareProfileSave('user-1', recoveryForm);
    mockUsersRead.mockResolvedValue({ data: { ...mockProfile }, error: null });
    const renderer = await renderScreen();
    edit(renderer, 'Goal', 'Newer unsaved goal');
    mockUsersRead.mockResolvedValue({ data: canonicalProfile(recoveryForm), error: null });
    await press(renderer, 'Save changes');
    expect(mockUsersUpdate).not.toHaveBeenCalled();
    expect(input(renderer, 'Goal').props.value).toBe('Newer unsaved goal');
    expect(renderer.root.findByProps({ accessibilityLabel: 'Save changes' }).props.disabled).toBe(false);
    expect(visible(renderer, 'newer edits still need saving')).toBe(true);
  });

  it('rejects duplicate saves and retains native exit protection until the write settles', async () => {
    const pending = deferred<{ error: Error | null }>();
    mockUsersUpdateEq.mockReturnValueOnce(pending.promise);
    const renderer = await renderScreen();
    edit(renderer, 'Goal', 'One save');
    let save!: Promise<void>;
    await act(async () => {
      const handler = renderer.root.findByProps({ accessibilityLabel: 'Save changes' }).props.onPress;
      save = handler();
      void handler();
    });
    expect(mockUsersUpdate).toHaveBeenCalledTimes(1);
    expect(mockPrevented).toBe(true);
    act(() => mockOnRemove({ data: { action: { type: 'GO_BACK' } } }));
    expect(mockDispatch).not.toHaveBeenCalled();
    await act(async () => { pending.resolve({ error: null }); await save; });
    expect(await readProfileSaveRecovery('user-1')).toBeNull();
  });

  it('ignores old hydration after A to B to A and keeps the latest account editor', async () => {
    const oldRead = deferred<{ data: Record<string, unknown> | null; error: Error | null }>();
    mockQuestionnaireRead.mockReturnValueOnce(oldRead.promise);
    const renderer = await renderScreen();
    mockUser = { id: 'user-2', email: 'b@example.com' };
    mockProfile = { ...mockProfile, id: 'user-2', full_name: 'B' };
    await act(async () => { renderer.update(<ProfileScreen />); });
    mockUser = { id: 'user-1', email: 'maya@example.com' };
    mockProfile = { ...mockProfile, id: 'user-1', full_name: 'Current A' };
    await act(async () => { renderer.update(<ProfileScreen />); });
    edit(renderer, 'Goal', 'New A edit');
    await act(async () => { oldRead.resolve({ data: { answers: JSON.stringify({ q14: 'OLD A' }) }, error: null }); });
    expect(input(renderer, 'Goal').props.value).toBe('New A edit');
    expect(input(renderer, 'Full name').props.value).toBe('Current A');
  });

  it('ignores buffered field changes from the previous account', async () => {
    const renderer = await renderScreen();
    const oldEdit = input(renderer, 'Goal').props.onChangeText;
    mockUser = { id: 'user-2', email: 'b@example.com' };
    mockProfile = { ...mockProfile, id: 'user-2', full_name: 'B' };
    await act(async () => { renderer.update(<ProfileScreen />); });
    act(() => oldEdit('A buffered edit'));
    expect(input(renderer, 'Goal').props.value).toBe('');
  });

  it('keeps old users acknowledgment scoped to A while B saves independently', async () => {
    mockQuestionnaireRead.mockResolvedValue({ data: assessmentRow, error: null });
    const pending = deferred<{ error: Error | null }>();
    const pendingB = deferred<{ error: Error | null }>();
    mockUsersUpdateEq.mockReturnValueOnce(pending.promise).mockReturnValueOnce(pendingB.promise);
    const renderer = await renderScreen();
    edit(renderer, 'Goal', 'A intent');
    let saveA!: Promise<void>;
    await act(async () => { saveA = renderer.root.findByProps({ accessibilityLabel: 'Save changes' }).props.onPress(); });
    mockUser = { id: 'user-2', email: 'b@example.com' };
    mockProfile = { ...mockProfile, id: 'user-2', full_name: 'B' };
    await act(async () => { renderer.update(<ProfileScreen />); });
    edit(renderer, 'Goal', 'B intent');
    let saveB!: Promise<void>;
    await act(async () => { saveB = renderer.root.findByProps({ accessibilityLabel: 'Save changes' }).props.onPress(); });
    await act(async () => { pending.resolve({ error: null }); await saveA; });
    expect(input(renderer, 'Goal').props.value).toBe('B intent');
    expect(input(renderer, 'Goal').props.editable).toBe(false);
    expect((await readProfileSaveRecovery('user-2'))?.phase).toBe('prepared');
    await act(async () => { pendingB.resolve({ error: null }); await saveB; });
    expect((await readProfileSaveRecovery('user-1'))?.phase).toBe('profile-saved');
    expect(await readProfileSaveRecovery('user-2')).toBeNull();
    expect(mockUsersUpdateEq.mock.calls).toEqual([['id', 'user-1'], ['id', 'user-2']]);
    expect(mockQuestionnaireUserFilter.mock.calls).toEqual([['user_id', 'user-2']]);
  });

  it('waits for an unmounted writer before reconciling its prepared journal', async () => {
    const pending = deferred<{ error: Error | null }>();
    mockUsersUpdateEq.mockReturnValueOnce(pending.promise);
    let renderer = await renderScreen();
    edit(renderer, 'Goal', 'Survive in flight');
    let save!: Promise<void>;
    await act(async () => { save = renderer.root.findByProps({ accessibilityLabel: 'Save changes' }).props.onPress(); });
    const savedForm = (await readProfileSaveRecovery('user-1'))!.form;
    act(() => renderer.unmount());
    mockUsersRead.mockResolvedValue({ data: canonicalProfile(savedForm), error: null });
    renderer = await renderScreen();
    expect(renderer.root.findAllByType(MockInput)).toHaveLength(0);
    expect(mockUsersRead).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve({ error: null }); await save; });
    expect(input(renderer, 'Goal').props.value).toBe('Survive in flight');
    await press(renderer, 'Retry assessment sync');
    expect(mockUsersUpdate).toHaveBeenCalledTimes(1);
    expect(mockAuthUpdateUser).toHaveBeenCalledTimes(1);
    expect(await readProfileSaveRecovery('user-1')).toBeNull();
  });

  it('retries only device cleanup after both remote writes were acknowledged', async () => {
    mockQuestionnaireRead.mockResolvedValue({ data: assessmentRow, error: null });
    const renderer = await renderScreen();
    edit(renderer, 'Goal', 'Saved remotely');
    jest.mocked(AsyncStorage.removeItem).mockRejectedValueOnce(new Error('disk unavailable'));
    await press(renderer, 'Save changes');
    expect(visible(renderer, 'Profile is saved')).toBe(true);
    expect((await readProfileSaveRecovery('user-1'))?.phase).toBe('profile-saved');
    await press(renderer, 'Retry assessment sync');
    expect(mockQuestionnaireUpdate).toHaveBeenCalledTimes(1);
    expect(mockAuthUpdateUser).toHaveBeenCalledTimes(1);
    expect(mockUsersUpdate).toHaveBeenCalledTimes(1);
    expect(await readProfileSaveRecovery('user-1')).toBeNull();
  });

  it('keeps the durable retry on native exit and only discards unjournaled edits', async () => {
    const entry = await prepareProfileSave('user-1', recoveryForm);
    mockUsersRead.mockResolvedValue({ data: canonicalProfile(recoveryForm), error: null });
    const renderer = await renderScreen();
    const alert = jest.spyOn(Alert, 'alert');
    act(() => mockOnRemove({ data: { action: { type: 'GO_BACK' } } }));
    const options = alert.mock.calls.at(-1)?.[2] ?? [];
    await act(async () => { options.find((option) => option.text === 'Leave anyway')?.onPress?.(); });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
    expect((await readProfileSaveRecovery('user-1'))?.id).toBe(entry.id);
    act(() => renderer.unmount());
  });
});
