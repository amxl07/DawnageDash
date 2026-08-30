import { AccessibilityInfo, findNodeHandle, Modal } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { PhotoViewer, photoPositionForSourceIndex, type ViewerPhoto } from './PhotoViewer';

const mockUseMotion = jest.fn(() => ({ reduced: false }));

jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));

jest.mock('lucide-react-native', () => ({
  ChevronLeft: jest.requireActual('react-native').View,
  ChevronRight: jest.requireActual('react-native').View,
  X: jest.requireActual('react-native').View,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}));

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const mock = Object.create(actual);
  Object.defineProperty(mock, 'AccessibilityInfo', {
    configurable: true,
    value: {
      ...actual.AccessibilityInfo,
      announceForAccessibility: jest.fn(),
      setAccessibilityFocus: jest.fn(),
    },
  });
  Object.defineProperty(mock, 'findNodeHandle', {
    configurable: true,
    value: jest.fn(() => 42),
  });
  return mock;
});

jest.mock('@/components/ui', () => {
  const Native = jest.requireActual('react-native') as typeof import('react-native');
  return {
    Text: ({ children, ...props }: React.ComponentProps<typeof Native.Text>) => (
      <Native.Text {...props}>{children}</Native.Text>
    ),
  };
});

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { lg: 24, xl: 32 },
  spacing: { xs: 4, base: 16 },
  useMotion: () => mockUseMotion(),
  useTheme: () => ({
    colors: {
      background: '#000',
      borderStrong: '#555',
      foreground: '#fff',
      primary: '#f00',
    },
  }),
}));

const photos: ViewerPhoto[] = [
  {
    label: 'Front',
    weekLabel: 'Week 3',
    url: 'https://example.com/front.jpg',
    caption: '30 Aug 2026',
  },
  {
    label: 'Back',
    weekLabel: 'Week 3',
    url: 'https://example.com/back.jpg',
    caption: '30 Aug 2026',
  },
];

describe('PhotoViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMotion.mockReturnValue({ reduced: false });
  });

  it('waits for native modal presentation, then focuses and announces each position', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<PhotoViewer photos={photos} startIndex={0} onClose={jest.fn()} />);
    });

    expect(findNodeHandle).not.toHaveBeenCalled();
    expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();

    const modal = renderer.root.findByType(Modal);
    act(() => modal.props.onShow());

    expect(findNodeHandle).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenLastCalledWith(42);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenLastCalledWith(
      'Front photo, Week 3, 1 of 2',
    );
    expect(
      jest.mocked(AccessibilityInfo.setAccessibilityFocus).mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(AccessibilityInfo.announceForAccessibility).mock.invocationCallOrder[0],
    );
    expect(renderer.root.findByProps({ accessibilityLabel: 'Front photo, Week 3, 1 of 2' }).props)
      .toMatchObject({ accessible: true, accessibilityRole: 'image' });

    const next = renderer.root.find(
      (node: { props: { accessibilityLabel?: string } }) =>
        node.props.accessibilityLabel === 'Next angle',
    );
    act(() => next.props.onPress());

    expect(findNodeHandle).toHaveBeenCalledTimes(2);
    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(2);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenLastCalledWith(
      'Back photo, Week 3, 2 of 2',
    );
    expect(
      jest.mocked(AccessibilityInfo.setAccessibilityFocus).mock.invocationCallOrder[1],
    ).toBeLessThan(
      jest.mocked(AccessibilityInfo.announceForAccessibility).mock.invocationCallOrder[1],
    );
  });

  it('gives the displayed image explicit dimensions and keeps pager dots decorative', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<PhotoViewer photos={photos} startIndex={0} onClose={jest.fn()} />);
    });

    const image = renderer.root.findByType('ExpoImage');
    expect(image.props).toMatchObject({
      source: { uri: 'https://example.com/front.jpg' },
      contentFit: 'contain',
      cachePolicy: 'memory-disk',
      recyclingKey: 'viewer:https://example.com/front.jpg',
    });
    expect(image.props.style).toEqual(expect.objectContaining({ width: '100%', height: '100%' }));

    const dots = renderer.root.findAll(
      (node: { props: { testID?: string } }) => node.props.testID?.startsWith('photo-position-dot-'),
    );
    expect(new Set(dots.map((dot: { props: { testID?: string } }) => dot.props.testID)).size).toBe(2);
    expect(dots.every((dot: { props: { accessible?: boolean } }) => dot.props.accessible === false)).toBe(true);
  });

  it('removes the viewer fade when Reduced Motion is enabled', () => {
    mockUseMotion.mockReturnValue({ reduced: true });
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<PhotoViewer photos={photos} startIndex={0} onClose={jest.fn()} />);
    });

    expect(renderer.root.findByType(Modal).props.animationType).toBe('none');
  });

  it('maps a tapped source slot to its filtered viewer position', () => {
    const sourceSlots = [
      { url: null },
      { url: 'back.jpg' },
      { url: 'left.jpg' },
      { url: null },
    ];

    expect(photoPositionForSourceIndex(sourceSlots, 1)).toBe(0);
    expect(photoPositionForSourceIndex(sourceSlots, 2)).toBe(1);
    expect(photoPositionForSourceIndex(sourceSlots, 0)).toBeNull();
  });
});
