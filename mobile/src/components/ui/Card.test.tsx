import { StyleSheet } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { Card } from './Card';

jest.mock('@/theme', () => ({
  radius: { card: 20 },
  spacing: { base: 16 },
  useTheme: () => ({
    colors: { card: '#ffffff', elevated: '#f8f8f8', border: '#cccccc' },
    shadow: { card: { elevation: 2 }, sheet: { elevation: 8 } },
  }),
}));

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
      if (!node) throw new Error(`No element found: ${testID}`);
      return node;
    },
  };
}

describe('Card', () => {
  it('uses a continuous corner curve for cards', () => {
    const { getByTestId } = render(<Card testID="card" />);

    expect(StyleSheet.flatten(getByTestId('card').props.style)).toMatchObject({
      borderCurve: 'continuous',
    });
  });
});
