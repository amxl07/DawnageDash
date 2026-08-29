import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { ProgressBar } from './ProgressBar';

jest.mock('@/theme', () => ({
  radius: { pill: 999 },
  useMotion: () => ({
    duration: { enter: 200 },
    easing: { standard: [0.16, 1, 0.3, 1] },
    enabled: true,
    reduced: false,
  }),
  useTheme: () => ({
    colors: { primary: '#ff0000', elevated: '#ffffff', border: '#cccccc' },
    isDark: false,
  }),
}));

function render(ui: React.ReactElement) {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(ui);
  });

  return {
    getByRole: (role: string) => {
      const [node] = renderer.root.findAll(
        (candidate: { props: { accessibilityRole?: string } }) => candidate.props.accessibilityRole === role,
      );
      if (!node) throw new Error(`No element found with accessibility role ${role}`);
      return node;
    },
  };
}

describe('ProgressBar', () => {
  it.each([
    [-1, 0],
    [0.42, 42],
    [2, 100],
    [Number.NaN, 0],
  ])('exposes a clamped value for %p', (value, now) => {
    const { getByRole } = render(<ProgressBar value={value} accessibilityLabel="Progress" />);

    expect(getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now });
  });

  it('animates the fill with scaleX instead of an animated percentage width', () => {
    const source = readFileSync(resolve(__dirname, 'ProgressBar.tsx'), 'utf8');

    expect(source).toContain('transform: [{ scaleX: progress.get() }]');
    expect(source).not.toMatch(/width:\s*`\$\{[^`]+\*\s*100\}%`/);
  });
});
