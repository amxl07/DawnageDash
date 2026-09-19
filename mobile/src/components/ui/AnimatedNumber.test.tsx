import { act, create } from 'react-test-renderer';

import { AnimatedNumber } from './AnimatedNumber';

const mockUseMotion = jest.fn();
let mockFontScale = 1;

jest.mock('react-native', () => {
  const descriptors = Object.getOwnPropertyDescriptors(jest.requireActual('react-native'));
  descriptors.useWindowDimensions = {
    configurable: true,
    enumerable: descriptors.useWindowDimensions?.enumerable ?? true,
    writable: true,
    value: () => ({ width: 390, height: 844, scale: 3, fontScale: mockFontScale }),
  };
  return Object.defineProperties({}, descriptors);
});

jest.mock('@/theme', () => ({
  tabularNums: { fontVariant: ['tabular-nums'] },
  type: {
    metric: { fontSize: 28, lineHeight: 34 },
    bodySm: { fontSize: 14, lineHeight: 20 },
  },
  useMotion: () => mockUseMotion(),
  useTheme: () => ({
    colors: {
      foreground: '#111111',
      mutedForeground: '#777777',
      primary: '#0000ff',
      success: '#00aa00',
      gold: '#cc9900',
      onPrimary: '#ffffff',
    },
  }),
}));

function render(ui: React.ReactElement) {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(ui);
  });

  return {
    root: renderer!.root,
    getByText: (text: string) => {
      const [node] = renderer.root.findAll(
        (candidate: { children: unknown[] }) => candidate.children.join('') === text,
      );
      if (!node) throw new Error(`No text found: ${text}`);
      return node;
    },
  };
}

describe('AnimatedNumber', () => {
  beforeEach(() => {
    mockFontScale = 1;
    mockUseMotion.mockReturnValue({
      duration: { enter: 200, exit: 160, value: 260 },
      easing: { standard: [0.16, 1, 0.3, 1] },
      enabled: true,
      reduced: false,
    });
  });

  it('renders a plain final value when motion is reduced', () => {
    mockUseMotion.mockReturnValue({
      duration: { enter: 0, exit: 0, value: 0 },
      easing: { standard: [0.16, 1, 0.3, 1] },
      enabled: false,
      reduced: true,
    });

    const { getByText } = render(<AnimatedNumber value={12.5} precision={1} suffix="kg" />);

    expect(getByText('12.5kg')).toBeTruthy();
  });

  it.each([1.1, 2])('keeps the complete metric readable at font scale %s', (fontScale) => {
    mockFontScale = fontScale;
    const { getByText } = render(<AnimatedNumber value={-12.5} precision={1} suffix="kg" />);
    expect(getByText('-12.5kg')).toBeTruthy();
  });

  it('exposes one formatted value while hiding the rolling digit stacks', () => {
    const { root } = render(<AnimatedNumber value={-12.5} precision={1} suffix="kg" />);
    const [metric] = root.findAll((node) => node.props.accessibilityRole === 'text');
    expect(metric.props.accessibilityLabel).toBe('-12.5 kg');
    expect(metric.props.accessible).toBe(true);
    expect(root.findAll((node) => node.props.importantForAccessibility === 'no-hide-descendants').length).toBeGreaterThan(0);
  });
});
