import { createRef } from 'react';
import { Platform, StyleSheet, Text, type View } from 'react-native';
import { useScrollToTop } from 'expo-router/react-navigation';

import { act, create, type ReactTestInstance } from 'react-test-renderer';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { NativeTabsContext, NativeHeaderContext } from '@/components/navigation/NavigationChrome';
import { Screen } from './Screen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: jest.fn(),
}));

jest.mock('expo-router/react-navigation', () => ({
  useScrollToTop: jest.fn(),
}));

jest.mock('@/theme', () => ({
  horizontalInset: (width: number) => (width >= 768 ? 24 : 16),
  screenContentPadding: (archetype: string, insets: { top: number; bottom: number }) => ({
    paddingTop: archetype === 'sheet' ? 16 : insets.top + 16,
    paddingBottom: insets.bottom + 24,
  }),
  spacing: { base: 16, lg: 24 },
  useTheme: () => ({ colors: { background: '#ffffff' } }),
}));

const mockedUseResponsiveLayout = jest.mocked(useResponsiveLayout);
const mockUseScrollToTop = jest.mocked(useScrollToTop);

function render(ui: React.ReactElement) {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(ui);
  });

  return {
    getByTestId: (testID: string) => {
      const [node] = renderer.root.findAll(
        (candidate: { props: { testID?: string; style?: unknown } }) =>
          candidate.props.testID === testID && candidate.props.style !== undefined,
      );
      if (!node) throw new Error(`No styled native view found for testID: ${testID}`);
      return node;
    },
  };
}

function expectToHaveStyle(node: ReactTestInstance, style: object) {
  expect(StyleSheet.flatten(node.props.style)).toMatchObject(style);
}

describe('Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseResponsiveLayout.mockReturnValue({
      width: 320,
      height: 640,
      fontScale: 1,
      mode: 'compact',
      isCompact: true,
      isWide: false,
      horizontal: 16,
      maxContentWidth: undefined,
    });
  });

  it('keeps child screen content below the top safe area', () => {
    const { getByTestId } = render(
      <Screen testID="screen-content">
        <Text>Content</Text>
      </Screen>,
    );

    expectToHaveStyle(getByTestId('screen-content'), { paddingTop: 63 });
  });

  it('registers a root scroll view for active-tab reselect', () => {
    render(<Screen archetype="root"><Text>Home</Text></Screen>);

    expect(mockUseScrollToTop).toHaveBeenCalledTimes(1);
    expect(mockUseScrollToTop.mock.calls[0][0].current).toBeTruthy();
  });

  it('exposes an unflattened native content view for field measurements', () => {
    const contentRef = createRef<View>();
    render(<Screen contentRef={contentRef}><Text>Required field</Text></Screen>);

    expect(contentRef.current?.measureLayout).toEqual(expect.any(Function));
    expect(contentRef.current?.props.collapsable).toBe(false);
    // This outer content view starts at the scroll origin, before the inner
    // view's safe-area padding and responsive centering.
    expect(StyleSheet.flatten(contentRef.current?.props.style)).toMatchObject({ paddingLeft: 16, paddingRight: 16 });
  });

  it('keeps scroll-to-top registration unconditional for non-scrolling screens', () => {
    render(<Screen scroll={false}><Text>Static content</Text></Screen>);

    expect(mockUseScrollToTop).toHaveBeenCalledTimes(1);
    expect(mockUseScrollToTop.mock.calls[0][0].current).toBeNull();
  });

  it('does not add a top safe-area inset inside sheets', () => {
    const { getByTestId } = render(
      <Screen archetype="sheet" testID="screen-content">
        <Text>Content</Text>
      </Screen>,
    );

    expectToHaveStyle(getByTestId('screen-content'), { paddingTop: 16 });
  });

  it('centers wide screen content within the responsive maximum width', () => {
    mockedUseResponsiveLayout.mockReturnValue({
      width: 768,
      height: 1024,
      fontScale: 1,
      mode: 'wide',
      isCompact: false,
      isWide: true,
      horizontal: 24,
      maxContentWidth: 720,
    });

    const { getByTestId } = render(
      <Screen testID="screen-content">
        <Text>Content</Text>
      </Screen>,
    );

    expectToHaveStyle(getByTestId('screen-content'), {
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
    });
  });

  it('adds a measured wrapping footer height to its scroll clearance', () => {
    const { getByTestId } = render(
      <Screen archetype="editor" footerHeight={148} testID="screen-content">
        <Text>Large-text editor</Text>
      </Screen>,
    );

    expectToHaveStyle(getByTestId('screen-content'), { paddingBottom: 172 });
  });
});


it('lets native tab scrolling own its system insets exactly once', () => {
  mockedUseResponsiveLayout.mockReturnValue({ width: 390, height: 844, fontScale: 1, mode: 'regular', isCompact: false, isWide: false, horizontal: 20, maxContentWidth: undefined });
  const view = render(<NativeTabsContext value={true}><Screen archetype="root" testID="native-root"><Text>Content</Text></Screen></NativeTabsContext>);
  expectToHaveStyle(view.getByTestId('native-root'), { paddingTop: 16, paddingBottom: 24 });
});
it('does not reserve a second top inset below an opaque native stack header', () => {
  const view = render(<NativeHeaderContext value={true}><Screen testID="native-detail"><Text>Detail</Text></Screen></NativeHeaderContext>);
  expectToHaveStyle(view.getByTestId('native-detail'), { paddingTop: 16 });
});

// NativeTabs wraps Android content in the native tab height, including its bottom inset.
it('leaves Android bottom tab clearance to the native wrapper', () => {
  const previous = Platform.OS;
  Platform.OS = 'android';
  try {
    const view = render(<NativeTabsContext value={true}><Screen archetype="root" testID="android-root"><Text>Content</Text></Screen></NativeTabsContext>);
    expectToHaveStyle(view.getByTestId('android-root'), { paddingTop: 63, paddingBottom: 24 });
  } finally { Platform.OS = previous; }
});
