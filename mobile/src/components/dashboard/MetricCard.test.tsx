import { Text as NativeText, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { MetricCard } from './MetricCard';

const Dumbbell = (() => null) as unknown as LucideIcon;
const MockNativeText = NativeText;
const MockView = View;

jest.mock('lucide-react-native', () => ({
  TrendingDown: () => null,
  TrendingUp: () => null,
}));

jest.mock('@/components/ui', () => ({
  AnimatedNumber: ({ value }: { value: number }) => <MockNativeText>{String(value)}</MockNativeText>,
  Card: ({ children, ...props }: React.ComponentProps<typeof MockView>) => (
    <MockView {...props}>{children}</MockView>
  ),
  Text: ({ children, ...props }: React.ComponentProps<typeof NativeText>) => (
    <MockNativeText {...props}>{children}</MockNativeText>
  ),
}));

jest.mock('@/theme', () => ({
  iconSize: { sm: 16 },
  spacing: { xs: 4, sm: 8 },
  useTheme: () => ({
    colors: { mutedForeground: '#666', success: '#080' },
  }),
}));

function render(ui: React.ReactElement) {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(ui);
  });
  return renderer!;
}

describe('MetricCard', () => {
  it('allows a long label and caption to wrap in a compact grid cell', () => {
    const renderer = render(
      <MetricCard
        icon={Dumbbell}
        label="All workouts completed this week"
        value="12"
        trend={{ value: 0, goodDirection: 'up', caption: 'Keep building your consistent training habit' }}
      />,
    );

    const textNodes = renderer.root.findAllByType(NativeText) as {
      props: { children?: string; numberOfLines?: number };
    }[];
    const label = textNodes.find((node) => node.props.children === 'All workouts completed this week');
    const caption = textNodes.find(
      (node) => node.props.children === 'Keep building your consistent training habit',
    );

    expect(label?.props.numberOfLines).not.toBe(1);
    expect(caption?.props.numberOfLines).not.toBe(1);
  });
});
