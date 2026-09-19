import { Text as MockNativeText } from 'react-native';
import { act, create } from 'react-test-renderer';

import { HistoryCaption } from './HistoryCaption';

jest.mock('@/components/ui', () => ({
  Text: ({ children, ...props }: React.ComponentProps<typeof MockNativeText>) => (
    <MockNativeText {...props}>{children}</MockNativeText>
  ),
}));
jest.mock('@/theme', () => ({
  spacing: { xs: 4 },
  useMotion: () => ({ enabled: false, duration: { feedback: 0 } }),
}));

const history = {
  points: [
    { date: '2026-08-01', value: 72.1 },
    { date: '2026-08-02', value: 73.4 },
    { date: '2026-08-03', value: 72.8 },
  ],
  min14: 72.1,
  max14: 73.4,
  lastValue: 72.8,
  count: 3,
};

it('stays hidden until the current field has been answered', () => {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<HistoryCaption value={null} history={history} unit="kg" precision={1} />);
  });
  expect(renderer.toJSON()).toBeNull();
});

it('renders the neutral range as accessible text after an answer', () => {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<HistoryCaption value={72.9} history={history} unit="kg" precision={1} />);
  });
  const output = JSON.stringify(renderer.toJSON());
  expect(output).toContain('Recent range 72.1–73.4 kg');
  expect(output).not.toMatch(/great|best|bad|worse/i);
});
