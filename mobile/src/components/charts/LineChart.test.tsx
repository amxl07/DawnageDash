import { Text as NativeText, View } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import type { Series } from './types';
import { LineChart } from './LineChart';

const MockNativeText = NativeText;
const MockView = View;
const mockGiftedLine = jest.fn();

jest.mock('react-native-gifted-charts', () => ({
  LineChart: (props: Record<string, unknown>) => {
    mockGiftedLine(props);
    return <MockView testID="gifted-line" />;
  },
}));

jest.mock('@/components/ui', () => ({
  Text: ({ children, ...props }: React.ComponentProps<typeof MockNativeText>) => (
    <MockNativeText {...props}>{children}</MockNativeText>
  ),
}));

jest.mock('@/theme', () => ({
  fonts: { interRegular: 'Inter' },
  spacing: { xs: 4, sm: 8, md: 12 },
  useMotion: () => ({ enabled: false, duration: { enter: 0 } }),
  useTheme: () => ({
    colors: { border: '#ddd', mutedForeground: '#666' },
  }),
}));

const series: Series[] = [
  { name: 'Chest', color: '#111', dash: [1, 1], data: [{ label: 'W0', value: 96 }, { label: 'W1', value: 95 }] },
  { name: 'Waist', color: '#222', dash: [2, 2], data: [{ label: 'W0', value: 86 }, { label: 'W1', value: 82 }] },
  { name: 'Hips', color: '#333', dash: [3, 3], data: [{ label: 'W0', value: 100 }, { label: 'W1', value: 98 }] },
  { name: 'Thighs', color: '#444', dash: [4, 4], data: [{ label: 'W0', value: 55 }, { label: 'W1', value: 54 }] },
  { name: 'Arms', color: '#555', dash: [5, 5], data: [{ label: 'W0', value: 34 }, { label: 'W1', value: 33 }] },
];

describe('LineChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards fourth and fifth series data, colors, and dash patterns', () => {
    act(() => {
      create(<LineChart series={series} summary="Five measurement trends." />);
    });

    expect(mockGiftedLine).toHaveBeenCalledWith(
      expect.objectContaining({
        data4: [
          { label: 'W0', value: 55 },
          { label: 'W1', value: 54 },
        ],
        data5: [
          { label: 'W0', value: 34 },
          { label: 'W1', value: 33 },
        ],
        color4: '#444',
        color5: '#555',
        strokeDashArray4: [4, 4],
        strokeDashArray5: [5, 5],
      }),
    );
  });
});
