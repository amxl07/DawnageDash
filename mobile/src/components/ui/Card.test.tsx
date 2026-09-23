import { StyleSheet, View } from 'react-native';
import { act, create } from 'react-test-renderer';

import { Card } from './Card';
import { Section } from './Section';

jest.mock('@/theme', () => ({
  radius: { card: 20 },
  spacing: { xs: 4, md: 12, base: 16 },
  tabularNums: {},
  type: {
    h2: { fontSize: 21, lineHeight: 27 },
    bodySm: { fontSize: 15, lineHeight: 21 },
  },
  useTheme: () => ({
    colors: {
      card: '#ffffff', elevated: '#f8f8f8', border: '#cccccc', foreground: '#111111',
      mutedForeground: '#666666', primary: '#bb3300', destructive: '#aa0000', onPrimary: '#ffffff',
    },
    shadow: { card: { elevation: 2 }, sheet: { elevation: 8 } },
  }),
}));

function render(ui: React.ReactElement) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(ui);
  });

  return {
    root: renderer.root,
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
  it('uses a quiet flat surface by default', () => {
    const { getByTestId } = render(<Card testID="card" />);

    expect(StyleSheet.flatten(getByTestId('card').props.style)).toMatchObject({
      borderCurve: 'continuous',
      borderWidth: 0,
      backgroundColor: '#ffffff',
    });
    expect(StyleSheet.flatten(getByTestId('card').props.style)).not.toMatchObject({ elevation: 2 });
  });

  it('keeps the elevated prop as a compatibility path while supporting explicit roles', () => {
    const elevated = render(<Card testID="elevated" elevated />);
    expect(StyleSheet.flatten(elevated.getByTestId('elevated').props.style)).toMatchObject({
      backgroundColor: '#f8f8f8',
      elevation: 8,
    });

    const metric = render(<Card testID="metric" surface="metric" elevation="raised" />);
    expect(StyleSheet.flatten(metric.getByTestId('metric').props.style)).toMatchObject({
      backgroundColor: '#f8f8f8',
      elevation: 2,
    });

    const hero = render(<Card testID="hero" surface="hero" />);
    expect(StyleSheet.flatten(hero.getByTestId('hero').props.style)).toMatchObject({ elevation: 2 });
  });
});

describe('Section', () => {
  it('groups labelled content without drawing a surface', () => {
    const view = render(
      <Section testID="section" title="Training" subtitle="This week">
        <View testID="content" style={{}} />
      </Section>,
    );

    expect(StyleSheet.flatten(view.getByTestId('section').props.style)).toMatchObject({
      backgroundColor: 'transparent',
    });
    expect(view.root.findByProps({ accessibilityRole: 'header' })).toBeTruthy();
    expect(view.getByTestId('content')).toBeTruthy();
  });
});
