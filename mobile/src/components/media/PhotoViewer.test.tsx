import { Image as ExpoImage } from 'expo-image';
import { AccessibilityInfo, findNodeHandle, Modal } from 'react-native';

import { act, create } from 'react-test-renderer';

import {
  PhotoViewer,
  focusPhotoTarget,
  photoPositionForSourceIndex,
  type ViewerPhoto,
} from './PhotoViewer';

jest.mock('@/hooks/usePrivatePhotoUrl', () => ({ usePrivatePhotoUrl: (reference: string) => ({ url: reference, loading: false, refresh: jest.fn() }) }));

const mockUseMotion = jest.fn(() => ({ reduced: false, duration: { micro: 160 } }));

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
    mockUseMotion.mockReturnValue({ reduced: false, duration: { micro: 160 } });
  });

  it('waits for native modal presentation and lets focused images own position speech', () => {
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
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Front photo, Week 3, 1 of 2' }).props)
      .toMatchObject({ accessible: true, accessibilityRole: 'image' });

    const next = renderer.root.find(
      (node: { props: { accessibilityLabel?: string } }) =>
        node.props.accessibilityLabel === 'Next angle',
    );
    act(() => next.props.onPress());

    expect(findNodeHandle).toHaveBeenCalledTimes(2);
    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(2);
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
  });

  it('uses DOM focus on web without asking React Native for a native handle', () => {
    const focus = jest.fn();

    expect(focusPhotoTarget({ focus }, 'web')).toBe(true);

    expect(focus).toHaveBeenCalledTimes(1);
    expect(findNodeHandle).not.toHaveBeenCalled();
    expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();
  });

  it('announces the position only when the displayed image cannot receive focus', () => {
    jest.mocked(findNodeHandle).mockReturnValueOnce(null);
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<PhotoViewer photos={photos} startIndex={0} onClose={jest.fn()} />);
    });

    act(() => renderer.root.findByType(Modal).props.onShow());

    expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Front photo, Week 3, 1 of 2',
    );
  });

  it('restores native accessibility focus to the source thumbnail after close', () => {
    const sourceTarget = {} as never;
    const onClose = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <PhotoViewer
          photos={photos}
          startIndex={0}
          onClose={onClose}
          returnFocusTarget={sourceTarget}
        />,
      );
    });

    act(() => {
      renderer.root.findByProps({ accessibilityLabel: 'Close photo viewer' }).props.onPress();
      renderer.unmount();
    });

    expect(findNodeHandle).toHaveBeenCalledWith(sourceTarget);
    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('gives the displayed image explicit dimensions and keeps pager dots decorative', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<PhotoViewer photos={photos} startIndex={0} onClose={jest.fn()} />);
    });

    const image = renderer.root.findByType(ExpoImage);
    expect(image.props).toMatchObject({
      source: { uri: 'https://example.com/front.jpg' },
      contentFit: 'contain',
      cachePolicy: 'none',
      recyclingKey: 'https://example.com/front.jpg',
      transition: 160,
    });
    expect(image.props.style).toEqual(expect.objectContaining({ width: '100%', height: '100%' }));

    const dots = renderer.root.findAll(
      (node: { props: { testID?: string } }) => node.props.testID?.startsWith('photo-position-dot-') === true,
    );
    expect(new Set(dots.map((dot: { props: { testID?: string } }) => dot.props.testID)).size).toBe(2);
    expect(dots.every((dot: { props: { accessible?: boolean } }) => dot.props.accessible === false)).toBe(true);
  });

  it('removes the viewer fade when Reduced Motion is enabled', () => {
    mockUseMotion.mockReturnValue({ reduced: true, duration: { micro: 160 } });
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<PhotoViewer photos={photos} startIndex={0} onClose={jest.fn()} />);
    });

    expect(renderer.root.findByType(Modal).props.animationType).toBe('none');
    expect(renderer.root.findByType(ExpoImage).props.transition).toBe(0);
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
