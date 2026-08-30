import { Text as NativeText, View } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import MoreScreen from './more';

const MockNativeText = NativeText;
const MockView = View;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));
jest.mock('lucide-react-native', () => ({
  Camera: () => null,
  LogOut: () => null,
  MessageSquareText: () => null,
  Ruler: () => null,
  Settings: () => null,
  User: () => null,
  UserRound: () => null,
}));
jest.mock('@/components/ui', () => ({
  Card: ({ children, ...props }: React.ComponentProps<typeof MockView>) => (
    <MockView {...props}>{children}</MockView>
  ),
  ListRow: ({ title }: { title: string }) => (
    <MockView testID={`row-${title}`}>
      <MockNativeText>{title}</MockNativeText>
    </MockView>
  ),
  Screen: ({ children, ...props }: React.ComponentProps<typeof MockView>) => (
    <MockView {...props}>{children}</MockView>
  ),
  Text: ({ children, ...props }: React.ComponentProps<typeof MockNativeText>) => (
    <MockNativeText {...props}>{children}</MockNativeText>
  ),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}));
jest.mock('@/hooks/useCoach', () => ({
  useCoach: () => ({ data: { kind: 'unassigned' } }),
  coachInitials: () => '—',
}));
jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { md: 20, lg: 24 },
  radius: { pill: 999 },
  spacing: { sm: 8, base: 16, lg: 24 },
  useTheme: () => ({
    colors: {
      borderStrong: '#bbb',
      elevated: '#eee',
      mutedForeground: '#666',
      primary: '#00f',
    },
  }),
}));

function renderScreen() {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<MoreScreen />);
  });
  return renderer;
}

describe('MoreScreen', () => {
  it('orders coaching, progress, and account around user goals', () => {
    const renderer = renderScreen();
    const visibleOrder = renderer.root
      .findAll(
        (node: { type?: unknown; props: { testID?: string } }) =>
          node.type === MockNativeText,
      )
      .map((node: { props: { children?: React.ReactNode } }) => node.props.children);

    expect(visibleOrder).toEqual([
      'More',
      'Coach status',
      'No coach assigned yet',
      'Coaching',
      'Weekly feedback',
      'Progress',
      'Measurements',
      'Progress photos',
      'Account',
      'Profile',
      'Settings',
      'Sign out',
    ]);
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Coach status: No coach assigned yet' }),
    ).toBeTruthy();
  });

  it('keeps the root screen as the only safe-area owner', () => {
    const renderer = renderScreen();
    const screen = renderer.root.find(
      (node: { props: { archetype?: string } }) => node.props.archetype === 'root',
    );

    expect(screen.props.includeTopSafeArea).not.toBe(false);
  });
});
