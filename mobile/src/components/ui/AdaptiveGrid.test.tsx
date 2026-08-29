import { StyleSheet, View } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { AdaptiveGrid } from './AdaptiveGrid';

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: jest.fn(),
}));

jest.mock('@/theme', () => ({
  spacing: { md: 16 },
}));

const mockedUseResponsiveLayout = jest.mocked(useResponsiveLayout);

function mockResponsiveLayout({ mode, isCompact }: { mode: 'compact' | 'regular'; isCompact: boolean }) {
  mockedUseResponsiveLayout.mockReturnValue({
    width: isCompact ? 320 : 640,
    height: 640,
    fontScale: 1,
    mode,
    isCompact,
    isWide: false,
    horizontal: 16,
    maxContentWidth: undefined,
  });
}

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

describe('AdaptiveGrid', () => {
  it('stacks children in compact mode', () => {
    mockResponsiveLayout({ mode: 'compact', isCompact: true });
    const { getByTestId } = render(
      <AdaptiveGrid testID="grid">
        <View />
        <View />
      </AdaptiveGrid>,
    );

    expectToHaveStyle(getByTestId('grid'), { flexDirection: 'column' });
  });

  it('lays out children in a wrapping row outside compact mode', () => {
    mockResponsiveLayout({ mode: 'regular', isCompact: false });
    const { getByTestId } = render(
      <AdaptiveGrid testID="grid">
        <View />
        <View />
      </AdaptiveGrid>,
    );

    expectToHaveStyle(getByTestId('grid'), { flexDirection: 'row', flexWrap: 'wrap' });
  });
});
