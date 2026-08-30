import { StyleSheet, Text as NativeText, View } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import ProfileScreen from './profile';

const MockNativeText = NativeText;
const MockView = View;
const mockMaybeSingle = jest.fn(async () => ({ data: null }));
const mockResponsiveLayout = jest.fn(() => ({ isCompact: true }));
const mockProfile = {
  id: 'user-1',
  full_name: 'Maya Singh',
  email: 'maya@example.com',
  phone_number: null,
  country: null,
  profile_data: {},
  package_start_date: '2026-08-01',
  package_duration: 3,
};

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('lucide-react-native', () => ({ ChevronDown: () => null, Clock: () => null }));
jest.mock('@/components/auth/CountryPicker', () => ({ CountryPicker: () => null }));
jest.mock('@/components/onboarding/TimezonePicker', () => ({ TimezonePicker: () => null }));
jest.mock('@/components/questionnaire', () => ({ QuestionnaireWizard: () => null }));
jest.mock('@/components/ui', () => ({
  Button: ({ label }: { label: string }) => <MockNativeText>{label}</MockNativeText>,
  Card: ({ children, ...props }: React.ComponentProps<typeof MockView>) => (
    <MockView {...props}>{children}</MockView>
  ),
  Input: ({ label }: { label: string }) => <MockNativeText>{label}</MockNativeText>,
  PageHeader: ({ title }: { title: string }) => <MockNativeText>{title}</MockNativeText>,
  Screen: ({ children, ...props }: React.ComponentProps<typeof MockView>) => (
    <MockView testID="profile-screen" {...props}>
      {children}
    </MockView>
  ),
  SegmentedControl: ({ segments }: { segments: { label: string }[] }) => (
    <MockView testID="profile-tabs" accessibilityLabel={segments.map((item) => item.label).join(', ')} />
  ),
  SkeletonCard: () => null,
  Text: ({ children, ...props }: React.ComponentProps<typeof MockNativeText>) => (
    <MockNativeText {...props}>{children}</MockNativeText>
  ),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'maya@example.com' }, signOut: jest.fn() }),
}));
jest.mock('@/hooks/useCoach', () => ({
  useCoach: () => ({ data: { kind: 'unavailable' } }),
  coachInitials: () => '—',
}));
jest.mock('@/hooks/usePlans', () => ({
  useUserProfile: () => ({
    isLoading: false,
    data: mockProfile,
  }),
}));
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => mockResponsiveLayout(),
}));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { updateUser: jest.fn(async () => ({ error: null })) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
      update: () => ({ eq: jest.fn(async () => ({ error: null })) }),
    }),
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

async function renderScreen() {
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(<ProfileScreen />);
    await Promise.resolve();
  });
  return renderer;
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockMaybeSingle.mockClear();
    mockResponsiveLayout.mockReturnValue({ isCompact: true });
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
});
