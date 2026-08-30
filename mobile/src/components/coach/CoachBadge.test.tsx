import { Text as NativeText, View } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import type { CoachLookup } from '@/hooks/useCoach';

import { CoachBadge } from './CoachBadge';

const MockNativeText = NativeText;
const mockUseCoach = jest.fn<{ data: CoachLookup | undefined }, []>();

jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));

jest.mock('@/hooks/useCoach', () => {
  const actual = jest.requireActual('@/hooks/useCoach');
  return {
    ...actual,
    useCoach: () => mockUseCoach(),
  };
});

jest.mock('@/components/ui', () => ({
  Text: ({ children, ...props }: React.ComponentProps<typeof NativeText>) => (
    <MockNativeText {...props}>{children}</MockNativeText>
  ),
}));

jest.mock('@/theme', () => ({
  radius: { card: 16, pill: 999 },
  spacing: { md: 12, base: 16 },
  useTheme: () => ({
    colors: {
      border: '#ddd',
      borderStrong: '#bbb',
      card: '#fff',
      elevated: '#eee',
    },
  }),
}));

function renderBadge(props?: React.ComponentProps<typeof CoachBadge>) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<CoachBadge {...props} />);
  });
  return renderer;
}

describe('CoachBadge', () => {
  beforeEach(() => {
    mockUseCoach.mockReset();
  });

  it('hides an unassigned coach by default for compact placements', () => {
    mockUseCoach.mockReturnValue({ data: { kind: 'unassigned' } });

    expect(renderBadge().toJSON()).toBeNull();
  });

  it.each([
    [{ kind: 'unassigned' } as const, 'No coach assigned yet.'],
    [{ kind: 'unavailable' } as const, 'Coach details are temporarily unavailable.'],
  ])('renders an intentional status for %s', (data, expected) => {
    mockUseCoach.mockReturnValue({ data });

    const renderer = renderBadge({ fallback: 'status' });

    expect(renderer.root.findByType(MockNativeText).props.children).toBe(expected);
  });

  it('renders assigned coach initials, name, caption, and one combined accessibility label', () => {
    mockUseCoach.mockReturnValue({
      data: {
        kind: 'assigned',
        coach: { id: 'c1', full_name: 'Amal Manoj', avatar_url: null },
      },
    });

    const renderer = renderBadge({ caption: 'Assigned by' });
    const text = renderer.root
      .findAllByType(MockNativeText)
      .map((node: { props: { children?: React.ReactNode } }) => node.props.children);
    const accessibilityLabels = renderer.root
      .findAllByType(View)
      .filter(
        (node: { props: { accessibilityLabel?: unknown } }) =>
          typeof node.props.accessibilityLabel === 'string',
      )
      .map((node: { props: { accessibilityLabel?: string } }) => node.props.accessibilityLabel);

    expect(text).toEqual(expect.arrayContaining(['AM', 'Assigned by', 'Amal Manoj']));
    expect(accessibilityLabels).toEqual(['Assigned by: Amal Manoj']);
  });

  it('renders the assigned coach portrait when one is available', () => {
    mockUseCoach.mockReturnValue({
      data: {
        kind: 'assigned',
        coach: {
          id: 'c1',
          full_name: 'Amal Manoj',
          avatar_url: 'https://example.com/amal.jpg',
        },
      },
    });

    const renderer = renderBadge();
    const portrait = renderer.root.findByType('ExpoImage');

    expect(portrait.props).toMatchObject({
      source: { uri: 'https://example.com/amal.jpg' },
      contentFit: 'cover',
      cachePolicy: 'memory-disk',
      accessible: false,
    });
  });
});
