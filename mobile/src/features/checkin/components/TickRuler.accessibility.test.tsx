import { Text as MockNativeText } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { TickRuler } from './TickRuler';

type MockPanGesture = {
  enabled: jest.Mock;
  activeOffsetX: jest.Mock;
  onUpdate: jest.Mock;
  onEnd: jest.Mock;
};

const mockPan: MockPanGesture = {
  enabled: jest.fn((): MockPanGesture => mockPan),
  activeOffsetX: jest.fn((): MockPanGesture => mockPan),
  onUpdate: jest.fn((): MockPanGesture => mockPan),
  onEnd: jest.fn((): MockPanGesture => mockPan),
};

jest.mock('react-native-gesture-handler', () => ({
  Gesture: { Pan: () => mockPan },
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('react-native-worklets', () => ({ scheduleOnRN: jest.fn() }));
jest.mock('@/components/ui', () => ({
  Text: ({ children, ...props }: { children: React.ReactNode }) => (
    <MockNativeText {...props}>{children}</MockNativeText>
  ),
}));
jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  radius: { md: 12 },
  spacing: { xs: 4, sm: 8, md: 12 },
  tabularNums: {},
  type: { metric: {} },
  useMotion: () => ({ enabled: false }),
  useTheme: () => ({
    colors: {
      borderStrong: '#777',
      destructive: '#c00',
      elevated: '#222',
      foreground: '#fff',
      mutedForeground: '#aaa',
      primary: '#f04e45',
    },
  }),
}));

it('exposes a decimal ruler value as text without passing fractional native integers', () => {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <TickRuler
        label="Morning weight"
        value={89.2}
        onChange={jest.fn()}
        min={20}
        max={400}
        step={0.1}
        precision={1}
        pxPerStep={12}
        unit="kg"
      />,
    );
  });

  expect(renderer.root.findByProps({ accessibilityRole: 'adjustable' }).props.accessibilityValue)
    .toEqual({ text: '89.2 kg' });
});
