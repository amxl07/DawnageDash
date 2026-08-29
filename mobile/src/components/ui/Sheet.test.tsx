import { AccessibilityInfo, findNodeHandle, StyleSheet, Text } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from './Sheet';

jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');

  const Modal = React.forwardRef(
    ({ children }: { children: React.ReactNode }, ref: React.ForwardedRef<{ present: () => void; dismiss: () => void }>) => {
      React.useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: jest.fn() }));
      return React.createElement(NativeView, null, children);
    },
  );
  Modal.displayName = 'MockBottomSheetModal';

  return {
    BottomSheetBackdrop: NativeView,
    BottomSheetFlatList: NativeView,
    BottomSheetModal: Modal,
    BottomSheetScrollView: NativeView,
    BottomSheetView: NativeView,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));

jest.mock('lucide-react-native', () => ({
  X: jest.requireActual('react-native').View,
}));

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const mock = Object.create(actual);
  Object.defineProperties(mock, {
    AccessibilityInfo: {
      configurable: true,
      value: { ...actual.AccessibilityInfo, setAccessibilityFocus: jest.fn() },
    },
    findNodeHandle: { configurable: true, value: jest.fn(() => 42) },
  });
  return mock;
});

jest.mock('./Text', () => ({
  Text: jest.requireActual('react-native').Text,
}));

jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { lg: 24 },
  radius: { card: 16 },
  spacing: { base: 16, md: 12 },
  useTheme: () => ({
    colors: {
      card: '#ffffff',
      border: '#d0d0d0',
      borderStrong: '#888888',
      mutedForeground: '#555555',
    },
  }),
}));

const mockSafeAreaInsets = jest.mocked(useSafeAreaInsets);
const mockAccessibilityInfo = jest.mocked(AccessibilityInfo);
const mockFindNodeHandle = jest.mocked(findNodeHandle);

describe('Sheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame;
    global.cancelAnimationFrame = jest.fn();
  });

  it('provides a named 44pt close action and bottom safe-area clearance', () => {
    mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });

    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <Sheet visible title="Exercise details" onClose={jest.fn()}>
          <Text>Prescription</Text>
        </Sheet>,
      );
    });

    const getByLabelText = (accessibilityLabel: string) => {
      const node = renderer.root.find(
        (candidate: { props: { accessibilityLabel?: string } }) =>
          candidate.props.accessibilityLabel === accessibilityLabel,
      );
      return node;
    };
    const getByTestId = (testID: string) => {
      const node = renderer.root.find(
        (candidate: { props: { testID?: string } }) => candidate.props.testID === testID,
      );
      return node;
    };

    expect(StyleSheet.flatten(getByLabelText('Close Exercise details').props.style)).toMatchObject({ minWidth: 44, minHeight: 44 });
    expect(StyleSheet.flatten(getByTestId('sheet-content').props.style)).toMatchObject({ paddingBottom: 34 });
  });

  it('moves accessibility focus to its title after presentation', () => {
    mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });

    act(() => {
      create(<Sheet visible title="Exercise details" onClose={jest.fn()}><Text>Prescription</Text></Sheet>);
    });

    expect(mockFindNodeHandle).toHaveBeenCalled();
    expect(mockAccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42);
  });
});
