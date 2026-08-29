import { StyleSheet, Text } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { Screen } from './Screen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
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

function expectToHaveStyle(node: { props: { style: unknown } }, style: object) {
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
});
