import { AccessibilityInfo, findNodeHandle, StyleSheet, Text } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from './Sheet';

let mockModalOnChange: ((index: number) => void) | undefined;
let mockModalProps: Record<string, unknown> = {};
const mockPresent = jest.fn();
const mockDismiss = jest.fn();

jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');

  const Modal = React.forwardRef(
    (
      {
        children,
        onChange,
        ...props
      }: { children: React.ReactNode; onChange?: (index: number) => void } & Record<string, unknown>,
      ref: React.ForwardedRef<{ present: () => void; dismiss: () => void }>,
    ) => {
      mockModalOnChange = onChange;
      mockModalProps = props;
      React.useImperativeHandle(ref, () => ({ present: mockPresent, dismiss: mockDismiss }));
      // Rendering children must not synthesize a presentation state change.
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
    mockModalOnChange = undefined;
    mockModalProps = {};
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

  it('waits for presentation before moving accessibility focus to its title once', () => {
    mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });

    act(() => {
      create(<Sheet visible title="Exercise details" onClose={jest.fn()}><Text>Prescription</Text></Sheet>);
    });

    expect(mockFindNodeHandle).not.toHaveBeenCalled();
    expect(mockAccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();

    act(() => mockModalOnChange?.(0));

    expect(mockFindNodeHandle).toHaveBeenCalledTimes(1);
    expect(mockAccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42);

    act(() => {
      mockModalOnChange?.(1);
      mockModalOnChange?.(0);
    });

    expect(mockAccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(1);
  });

  it('disables pan and backdrop dismissal while its owner is saving', () => {
    mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });
    const NonDismissibleSheet = Sheet as React.ComponentType<
      React.ComponentProps<typeof Sheet> & { dismissible: boolean }
    >;

    act(() => {
      create(
        <NonDismissibleSheet
          visible
          dismissible={false}
          title="Progress photos"
          onClose={jest.fn()}
        >
          <Text>Saving</Text>
        </NonDismissibleSheet>,
      );
    });

    expect(mockModalProps.enablePanDownToClose).toBe(false);
    const renderBackdrop = mockModalProps.backdropComponent as (props: object) => {
      props: { pressBehavior?: string };
    };
    expect(renderBackdrop({}).props.pressBehavior).toBe('none');
  });

  it('re-presents before forwarding an unexpected native dismissal while locked', () => {
    mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });
    const onClose = jest.fn();

    act(() => {
      create(
        <Sheet visible dismissible={false} title="Progress photos" onClose={onClose}>
          <Text>Unsaved photo</Text>
        </Sheet>,
      );
    });

    expect(mockPresent).toHaveBeenCalledTimes(1);

    act(() => {
      (mockModalProps.onDismiss as (() => void) | undefined)?.();
    });

    expect(mockPresent).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPresent.mock.invocationCallOrder[1]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
  });
});
