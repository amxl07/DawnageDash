import { act, create } from 'react-test-renderer';
import TabsLayout from '../../../../app/(app)/(tabs)/_layout';

jest.mock('expo-router/unstable-native-tabs', () => {
  const { View, Text } = jest.requireActual('react-native');
  const NativeTabs = ({ children, ...props }: any) => <View testID="native-tabs" {...props}>{children}</View>;
  NativeTabs.Trigger = Object.assign(({ children, name, ...props }: any) => <View testID={`route-${name}`} routeName={name} {...props}>{children}</View>, { Label: Text, Icon: () => null });
  return { NativeTabs };
});
jest.mock('@/components/navigation/useCheckInTabStatus', () => ({ useCheckInTabStatus: () => ({ needsCheckIn: false, label: 'Check in for today' }) }));
jest.mock('@/hooks/useReducedTransparency', () => ({ useReducedTransparency: () => true }));
jest.mock('@/theme', () => ({ useTheme: () => ({ colors: { primary: 'coral', mutedForeground: 'muted', card: 'solid' } }) }));

it('offers exactly five native destinations, with no hidden redirect or active editor', () => {
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<TabsLayout />); });
  const routes = renderer.root.findAll((node) => typeof node.type === 'string' && node.props.routeName);
  expect(routes.map((node) => node.props.routeName)).toEqual(['index', 'check-in', 'plans', 'nutrition', 'more']);
  expect(routes.map((node) => node.props.accessibilityLabel)).toEqual(['Home, your dashboard', 'Check in for today', 'Training plan and workout history', 'Nutrition plan and coach notes', 'You, profile and settings']);
  expect(renderer.root.findByProps({ testID: 'native-tabs' }).props.backgroundColor).toBe('solid');
});
