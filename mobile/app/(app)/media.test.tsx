// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import MediaScreen from './media';

const mockRows = [
  {
    id: 'week-0',
    user_id: 'user-1',
    date: '2026-08-30',
    front_url: null,
    back_url: 'https://example.com/back.jpg',
    side_left_url: 'https://example.com/left.jpg',
    side_right_url: null,
  },
];

jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('lucide-react-native', () => ({
  Camera: jest.requireActual('react-native').View,
  ChevronLeft: jest.requireActual('react-native').View,
  ChevronRight: jest.requireActual('react-native').View,
  Columns2: jest.requireActual('react-native').View,
  Plus: jest.requireActual('react-native').View,
  X: jest.requireActual('react-native').View,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}));

jest.mock('@/components/media/PhotoCaptureSheet', () => ({
  PhotoCaptureSheet: () => null,
}));

jest.mock('@/components/ui', () => {
  const Native = jest.requireActual('react-native') as typeof import('react-native');
  return {
    AnimatedFlatList: ({
      data,
      keyExtractor,
      ListHeaderComponent,
      renderItem,
    }: {
      data: typeof mockRows;
      keyExtractor: (row: (typeof mockRows)[number]) => string;
      ListHeaderComponent: React.ReactNode;
      renderItem: (info: { item: (typeof mockRows)[number]; index: number }) => React.ReactNode;
    }) => (
      <Native.View>
        {ListHeaderComponent}
        {data.map((item, index) => (
          <Native.View key={keyExtractor(item)}>{renderItem({ item, index })}</Native.View>
        ))}
      </Native.View>
    ),
    Badge: ({ label }: { label: string }) => <Native.Text>{label}</Native.Text>,
    Button: () => null,
    Card: ({ children, ...props }: React.ComponentProps<typeof Native.View>) => (
      <Native.View {...props}>{children}</Native.View>
    ),
    EmptyState: () => null,
    ErrorState: () => null,
    PageHeader: () => null,
    Screen: ({ children }: { children: React.ReactNode }) => <Native.View>{children}</Native.View>,
    SkeletonCard: () => null,
    Text: ({ children, ...props }: React.ComponentProps<typeof Native.Text>) => (
      <Native.Text {...props}>{children}</Native.Text>
    ),
    useListMotion: () => ({ itemLayoutAnimation: undefined }),
  };
});

jest.mock('@/hooks/useProgressPhotos', () => ({
  useProgressPhotos: () => ({
    data: mockRows,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/lib/photos', () => ({
  ANGLES: [
    { key: 'front', label: 'Front', column: 'front_url' },
    { key: 'back', label: 'Back', column: 'back_url' },
    { key: 'side_left', label: 'Left', column: 'side_left_url' },
    { key: 'side_right', label: 'Right', column: 'side_right_url' },
  ],
}));

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { sm: 16, md: 20, lg: 24, xl: 32 },
  radius: { sm: 8 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16 },
  useMotion: () => ({ reduced: true, duration: { micro: 0 } }),
  useTheme: () => ({
    colors: {
      background: '#000',
      border: '#333',
      borderStrong: '#555',
      elevated: '#222',
      foreground: '#fff',
      onPrimary: '#fff',
      primary: '#f00',
    },
  }),
}));

describe('MediaScreen', () => {
  it('opens the exact tapped photo when earlier angle slots are empty', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<MediaScreen />);
    });

    const backThumbnail = renderer.root.find(
      (node: { props: { accessibilityLabel?: string } }) =>
        node.props.accessibilityLabel === 'Back photo, week 0. Tap to view full screen.',
    );
    act(() => backThumbnail.props.onPress());

    const viewerImage = renderer.root.find(
      (node: { type: unknown; props: { recyclingKey?: string } }) =>
        node.type === 'ExpoImage' && node.props.recyclingKey?.startsWith('viewer:'),
    );
    expect(viewerImage.props.source).toEqual({ uri: 'https://example.com/back.jpg' });
    expect(viewerImage.props.accessibilityLabel).toBe('Back photo, Week 0, 1 of 2');
  });
});
