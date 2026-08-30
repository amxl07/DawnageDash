import { Pressable as MockPressable, Text as MockNativeText, View } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { StatusPill } from './StatusPill';
import { StickyActionBar } from './StickyActionBar';

jest.mock('lucide-react-native', () => ({
  Circle: 'Circle',
  CircleAlert: 'CircleAlert',
  CircleCheck: 'CircleCheck',
  CloudOff: 'CloudOff',
  LoaderCircle: 'LoaderCircle',
}));

jest.mock('@/theme', () => ({
  iconSize: { sm: 16 },
  radius: { pill: 999 },
  spacing: { xs: 4, sm: 8 },
  useTheme: () => ({
    colors: {
      border: '#ddd',
      destructive: '#c00',
      elevated: '#fff',
      gold: '#850',
      mutedForeground: '#666',
      success: '#070',
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));

jest.mock('./Button', () => ({
  Button: ({ label, testID }: { label: string; testID?: string }) => (
    <MockPressable testID={testID} accessibilityRole="button" accessibilityLabel={label} />
  ),
}));

jest.mock('./Text', () => ({
  Text: ({ children, ...props }: React.ComponentProps<typeof MockNativeText>) => (
    <MockNativeText {...props}>{children}</MockNativeText>
  ),
}));

function render(status: React.ComponentProps<typeof StatusPill>['status'], label?: string) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<StatusPill status={status} label={label} />);
  });
  return renderer;
}

describe('StatusPill', () => {
  it.each([
    ['saving', 'Saving…', 'LoaderCircle'],
    ['saved', 'Saved on this device', 'CircleCheck'],
    ['offline', 'Saved here · waiting to sync', 'CloudOff'],
    ['error', 'Couldn’t save draft', 'CircleAlert'],
  ] as const)('renders %s as an icon-and-text polite status', (status, label, icon) => {
    const renderer = render(status);
    const statusNode = renderer.root.findByProps({ role: 'status' });

    expect(statusNode.props).toMatchObject({
      accessible: true,
      accessibilityLabel: label,
      accessibilityLiveRegion: 'polite',
      'aria-live': 'polite',
    });
    expect(renderer.root.findByType(MockNativeText).props.children).toBe(label);
    expect(renderer.root.findByType(icon).props.accessible).toBe(false);
  });

  it('uses a custom visible and accessible label', () => {
    const renderer = render('saved', 'Draft secured locally');

    expect(renderer.root.findByProps({ role: 'status' }).props.accessibilityLabel).toBe(
      'Draft secured locally',
    );
    expect(renderer.root.findByType(MockNativeText).props.children).toBe('Draft secured locally');
  });

  it('renders nothing for an unchanged idle status with no label', () => {
    const renderer = render('idle');

    expect(renderer.toJSON()).toBeNull();
  });

  it('keeps the same status element when an unchanged status rerenders', () => {
    const renderer = render('saving');
    const initialStatusNode = renderer.root.findByType(View);

    act(() => renderer.update(<StatusPill status="saving" />));

    expect(renderer.root.findByType(View)).toBe(initialStatusNode);
  });

  it('lets a sticky action bar lay out step text alongside a semantic status', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <StickyActionBar
          status={
            <View testID="composite-status">
              <MockNativeText>Step 2 of 4</MockNativeText>
              <StatusPill status="saved" />
            </View>
          }
          primaryLabel="Continue"
          primaryTestID="checkin-next"
          onPrimary={jest.fn()}
        />,
      );
    });

    const compositeStatus = renderer.root.findByProps({ testID: 'composite-status' });
    expect(compositeStatus.parent?.type).toBe('View');
    expect(renderer.root.findByProps({ role: 'status' }).props.accessibilityLabel).toBe(
      'Saved on this device',
    );
    const primaryAction = renderer.root.findAllByProps({ testID: 'checkin-next' }).find(
      (node: { props: { accessibilityRole?: string } }) =>
        node.props.accessibilityRole === 'button',
    );
    expect(primaryAction?.props).toMatchObject({
      accessibilityRole: 'button',
      accessibilityLabel: 'Continue',
    });
  });
});
