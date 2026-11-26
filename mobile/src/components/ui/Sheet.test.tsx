import { AccessibilityInfo, BackHandler, findNodeHandle, Platform, StyleSheet, Text, View } from 'react-native';

import { act, create } from 'react-test-renderer';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from './Sheet';

let mockModalOnChange: ((index: number) => void) | undefined;
let mockModalProps: Record<string, unknown> = {};
const mockPresent = jest.fn();
const mockDismiss = jest.fn();
let mockHardwareBackHandler: (() => boolean) | undefined;
const mockRemoveHardwareBackHandler = jest.fn();

jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');

  const Modal = React.forwardRef(
    (
      {
        children,
        handleComponent: HandleComponent,
        onChange,
        ...props
      }: { children: React.ReactNode; handleComponent?: React.ComponentType<Record<string, unknown>>; onChange?: (index: number) => void } & Record<string, unknown>,
      ref: React.ForwardedRef<{ present: () => void; dismiss: () => void }>,
    ) => {
      mockModalOnChange = onChange;
      mockModalProps = { ...props, handleComponent: HandleComponent };
      React.useImperativeHandle(ref, () => ({ present: mockPresent, dismiss: mockDismiss }));
      // Rendering children must not synthesize a presentation state change.
      return React.createElement(
        NativeView,
        null,
        HandleComponent ? React.createElement(HandleComponent, { animatedIndex: {}, animatedPosition: {} }) : null,
        children,
      );
    },
  );
  Modal.displayName = 'MockBottomSheetModal';

  return {
    BottomSheetBackdrop: NativeView,
    BottomSheetFlatList: NativeView,
    BottomSheetHandle: ({ children, style }: { children?: React.ReactNode; style?: unknown }) => React.createElement(NativeView, { style }, children),
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
    BackHandler: {
      configurable: true,
      value: {
        ...actual.BackHandler,
        addEventListener: jest.fn((_event: string, handler: () => boolean) => {
          mockHardwareBackHandler = handler;
          return { remove: mockRemoveHardwareBackHandler };
        }),
      },
    },
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
    mockHardwareBackHandler = undefined;
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

    const closeStyle = getByLabelText('Close Exercise details').props.style;
    expect(StyleSheet.flatten(typeof closeStyle === 'function' ? closeStyle({ pressed: false }) : closeStyle)).toMatchObject({ minWidth: 44, minHeight: 44 });
    expect(StyleSheet.flatten(getByTestId('sheet-content').props.style)).toMatchObject({ paddingBottom: 34 });
    expect(mockModalProps).toMatchObject({ enableDynamicSizing: false, snapPoints: ['65%', '90%'] });
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

  it('focuses the title and restores its trigger directly on web', () => {
    mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });
    const platform = jest.replaceProperty(Platform, 'OS', 'web');
    const titleFocus = jest.fn();
    const triggerFocus = jest.fn();
    const trigger = { focus: triggerFocus } as unknown as View;
    const returnFocusRef = { current: trigger };
    const onClose = jest.fn();
    let renderer: ReturnType<typeof create> | undefined;

    mockFindNodeHandle.mockImplementation(() => {
      throw new Error('react-native-web findNodeHandle is unavailable');
    });

    try {
      act(() => {
        renderer = create(
          <Sheet visible={false} title="Exercise details" onClose={onClose} returnFocusRef={returnFocusRef}>
            <Text>Prescription</Text>
          </Sheet>,
        );
      });
      const titleInstance: unknown = renderer!.root.findByProps({ accessibilityRole: 'header' }).instance;
      if (typeof titleInstance !== 'object' || titleInstance === null) throw new Error('Expected a mounted title ref');
      Object.defineProperty(titleInstance, 'focus', { configurable: true, value: titleFocus });
      act(() => {
        renderer!.update(
          <Sheet visible title="Exercise details" onClose={onClose} returnFocusRef={returnFocusRef}>
            <Text>Prescription</Text>
          </Sheet>,
        );
      });

      expect(renderer!.root.findByProps({ accessibilityRole: 'header' }).props.tabIndex).toBe(-1);
      act(() => mockModalOnChange?.(1));
      expect(titleFocus).toHaveBeenCalledTimes(1);
      expect(titleFocus).toHaveBeenCalledWith({ preventScroll: true });

      act(() => {
        renderer!.update(
          <Sheet visible={false} title="Exercise details" onClose={onClose} returnFocusRef={returnFocusRef}>
            <Text>Prescription</Text>
          </Sheet>,
        );
      });
      act(() => (mockModalProps.onDismiss as (() => void) | undefined)?.());

      expect(triggerFocus).toHaveBeenCalledTimes(1);
      expect(triggerFocus).toHaveBeenCalledWith({ preventScroll: true });
      expect(mockFindNodeHandle).not.toHaveBeenCalled();
    } finally {
      mockFindNodeHandle.mockImplementation(() => 42);
      platform.restore();
      const mountedRenderer = renderer;
      if (mountedRenderer) act(() => mountedRenderer.unmount());
    }
  });

  it('disables pan and backdrop dismissal while its owner is saving', () => {
    mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });
    const NonDismissibleSheet = Sheet as React.ComponentType<
      React.ComponentProps<typeof Sheet> & { dismissible: boolean }
    >;

    const onClose = jest.fn();
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <NonDismissibleSheet
          visible
          dismissible={false}
          title="Progress photos"
          onClose={onClose}
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
    const close = renderer!.root.findByProps({ accessibilityLabel: 'Close Progress photos' });
    expect(close.props.accessibilityState).toEqual({ disabled: true });
    act(() => close.props.onPress());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not dismiss an initially hidden sheet before its first presentation', () => {
    mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });
    const onClose = jest.fn();
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <Sheet visible={false} title="Exercise details" onClose={onClose}>
          <Text>Prescription</Text>
        </Sheet>,
      );
    });
    expect(mockDismiss).not.toHaveBeenCalled();
    expect(mockPresent).not.toHaveBeenCalled();

    act(() => {
      renderer!.update(
        <Sheet visible title="Exercise details" onClose={onClose}>
          <Text>Prescription</Text>
        </Sheet>,
      );
    });
    expect(mockPresent).toHaveBeenCalledTimes(1);
    expect(mockDismiss).not.toHaveBeenCalled();

    act(() => {
      renderer!.update(
        <Sheet visible={false} title="Exercise details" onClose={onClose}>
          <Text>Prescription</Text>
        </Sheet>,
      );
    });
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('consumes the native onDismiss after a controlled clean close', () => {
    mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });
    const onClose = jest.fn();
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <Sheet visible title="Exercise details" onClose={onClose}>
          <Text>Prescription</Text>
        </Sheet>,
      );
    });

    const staleOnDismiss = mockModalProps.onDismiss as (() => void) | undefined;
    const closeButton = renderer!.root.findByProps({ accessibilityLabel: 'Close Exercise details' });
    act(() => closeButton.props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => {
      renderer!.update(
        <Sheet visible={false} title="Exercise details" onClose={onClose}>
          <Text>Prescription</Text>
        </Sheet>,
      );
    });
    expect(mockDismiss).toHaveBeenCalledTimes(1);

    act(() => staleOnDismiss?.());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('re-presents an unexpected dirty dismissal and consumes the native dismissal after Discard', () => {
    mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });
    const onClose = jest.fn();
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
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

    act(() => {
      renderer!.update(
        <Sheet visible={false} dismissible={false} title="Progress photos" onClose={onClose}>
          <Text>Unsaved photo</Text>
        </Sheet>,
      );
    });
    expect(mockDismiss).toHaveBeenCalledTimes(1);

    act(() => {
      (mockModalProps.onDismiss as (() => void) | undefined)?.();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPresent).toHaveBeenCalledTimes(2);
  });

  it('forwards an unexpected dismissible native dismissal once', () => {
    mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });
    const onClose = jest.fn();

    act(() => {
      create(
        <Sheet visible title="Exercise details" onClose={onClose}>
          <Text>Prescription</Text>
        </Sheet>,
      );
    });

    act(() => {
      (mockModalProps.onDismiss as (() => void) | undefined)?.();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPresent).toHaveBeenCalledTimes(1);
  });

  it('resets controlled-dismiss suppression when the sheet is presented again', () => {
    mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });
    const onClose = jest.fn();
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <Sheet visible title="Exercise details" onClose={onClose}>
          <Text>Prescription</Text>
        </Sheet>,
      );
    });
    act(() => {
      renderer!.update(
        <Sheet visible={false} title="Exercise details" onClose={onClose}>
          <Text>Prescription</Text>
        </Sheet>,
      );
    });
    act(() => {
      renderer!.update(
        <Sheet visible title="Exercise details" onClose={onClose}>
          <Text>Prescription</Text>
        </Sheet>,
      );
    });

    act(() => {
      (mockModalProps.onDismiss as (() => void) | undefined)?.();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restores accessibility focus to the trigger after a controlled close', () => {
    mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });
    const trigger = {} as View;
    const returnFocusRef = { current: trigger };
    mockFindNodeHandle.mockImplementation((node) => (node === trigger ? 84 : 42));
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <Sheet visible title="Exercise details" onClose={jest.fn()} returnFocusRef={returnFocusRef}>
          <Text>Prescription</Text>
        </Sheet>,
      );
    });
    act(() => mockModalOnChange?.(0));
    act(() => {
      renderer!.update(
        <Sheet visible={false} title="Exercise details" onClose={jest.fn()} returnFocusRef={returnFocusRef}>
          <Text>Prescription</Text>
        </Sheet>,
      );
    });

    expect(mockAccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalledWith(84);
    act(() => {
      (mockModalProps.onDismiss as (() => void) | undefined)?.();
    });
    expect(mockAccessibilityInfo.setAccessibilityFocus).toHaveBeenLastCalledWith(84);
  });

  it('handles hardware back explicitly and respects non-dismissible work', () => {
    mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });
    const onClose = jest.fn();

    act(() => {
      create(
        <Sheet visible dismissible={false} title="Progress photos" onClose={onClose}>
          <Text>Saving</Text>
        </Sheet>,
      );
    });

    expect(BackHandler.addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );
    expect(mockHardwareBackHandler?.()).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });
});


it('fits a short choice and gives a long editor expandable detents', () => {
  mockSafeAreaInsets.mockReturnValue({ top: 47, right: 0, bottom: 34, left: 0 });
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<Sheet role="choice" title="Keep your answers?" visible onClose={jest.fn()}><Text>Save or keep editing</Text></Sheet>); });
  expect(mockModalProps.enableDynamicSizing).toBe(true);
  act(() => renderer.update(<Sheet role="editor" title="Measurements" visible onClose={jest.fn()}><Text>Fields</Text></Sheet>));
  expect(mockModalProps.enableDynamicSizing).toBe(false);
  expect(mockModalProps.snapPoints).toEqual(['85%', '95%']);
});
