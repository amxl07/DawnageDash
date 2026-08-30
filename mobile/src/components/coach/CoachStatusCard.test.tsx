import { StyleSheet, Text as NativeText, View } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import type { CoachLookup } from '@/hooks/useCoach';

import { CoachStatusCard } from './CoachStatusCard';

const MockNativeText = NativeText;
const MockView = View;

jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));
jest.mock('lucide-react-native', () => ({ UserRound: 'UserRound' }));
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));

jest.mock('@/components/ui', () => ({
  Card: ({ children, ...props }: React.ComponentProps<typeof MockView>) => (
    <MockView {...props}>{children}</MockView>
  ),
  Text: ({ children, ...props }: React.ComponentProps<typeof NativeText>) => (
    <MockNativeText {...props}>{children}</MockNativeText>
  ),
}));

jest.mock('@/theme', () => ({
  iconSize: { lg: 24 },
  radius: { pill: 999 },
  spacing: { sm: 8, md: 12, base: 16 },
  useTheme: () => ({
    colors: {
      borderStrong: '#bbb',
      elevated: '#eee',
      mutedForeground: '#666',
    },
  }),
}));

function renderCard(lookup: CoachLookup) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<CoachStatusCard lookup={lookup} />);
  });
  return renderer;
}

function textContent(renderer: ReturnType<typeof create>) {
  return renderer.root
    .findAllByType(MockNativeText)
    .map((node: { props: { children?: React.ReactNode } }) => node.props.children);
}

describe('CoachStatusCard', () => {
  it.each([
    [{ kind: 'unassigned' } as const, 'No coach assigned yet'],
    [{ kind: 'unavailable' } as const, 'Coach details are temporarily unavailable'],
  ])('renders a truthful fallback for %s', (lookup, copy) => {
    const renderer = renderCard(lookup);

    expect(textContent(renderer)).toContain('Coach status');
    expect(textContent(renderer)).toContain(copy);
    expect(renderer.root.findByType('UserRound').props).toMatchObject({
      color: '#666',
      accessible: false,
    });
  });

  it('renders the assigned coach identity with the relationship label', () => {
    const renderer = renderCard({
      kind: 'assigned',
      coach: { id: 'c1', full_name: 'Amal Manoj', avatar_url: null },
    });

    expect(textContent(renderer)).toEqual(expect.arrayContaining(['AM', 'Your coach', 'Amal Manoj']));
    expect(renderer.root.findByProps({ accessible: true }).props.accessibilityLabel).toBe(
      'Your coach: Amal Manoj',
    );
  });

  it('shows an assigned relationship without inventing a missing coach name', () => {
    const renderer = renderCard({
      kind: 'assigned',
      coach: { id: 'c1', full_name: null, avatar_url: null },
    });

    expect(textContent(renderer)).toEqual(expect.arrayContaining(['Your coach', 'Coach assigned']));
  });

  it('does not expose an unsupported messaging action', () => {
    const renderer = renderCard({ kind: 'unassigned' });
    const actions = renderer.root.findAll(
      (node: { props: { accessibilityRole?: string } }) => node.props.accessibilityRole === 'button',
    );

    expect(actions).toHaveLength(0);
  });

  it('lets long assigned and fallback text wrap in compact large-text layouts', () => {
    const assigned = renderCard({
      kind: 'assigned',
      coach: {
        id: 'c1',
        full_name: 'Alexandria Catherine Montgomery-Wellington',
        avatar_url: null,
      },
    });
    const fallback = renderCard({ kind: 'unavailable' });
    const assignedText = assigned.root
      .findAllByType(MockNativeText)
      .find((node: { props: { children?: React.ReactNode } }) =>
        String(node.props.children).startsWith('Alexandria'),
      );
    const fallbackText = fallback.root
      .findAllByType(MockNativeText)
      .find(
        (node: { props: { children?: React.ReactNode } }) =>
          node.props.children === 'Coach details are temporarily unavailable',
      );

    expect(StyleSheet.flatten(assignedText?.props.style)).toMatchObject({ flexShrink: 1 });
    expect(StyleSheet.flatten(fallbackText?.props.style)).toMatchObject({ flexShrink: 1 });
    expect(assignedText?.props.numberOfLines).not.toBe(1);
    expect(fallbackText?.props.numberOfLines).not.toBe(1);
  });
});
