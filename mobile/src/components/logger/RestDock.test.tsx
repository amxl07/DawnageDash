import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { WorkoutRestFooter } from './RestDock';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('expo-router/js-tabs', () => {
  const React = jest.requireActual('react');
  return { BottomTabBarHeightContext: React.createContext(0) };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
}));
jest.mock('@/components/ui', () => ({
  Button: () => null,
  Text: jest.requireActual('react-native').Text,
}));
jest.mock('@/components/ui/DisclosureChevron', () => ({ DisclosureChevron: () => null }));
jest.mock('@/theme', () => ({
  spacing: { xs: 4, sm: 8, base: 16 },
  useTheme: () => ({ colors: { border: '#333333', card: '#111111' } }),
}));

it('reports the compact rest footer height for content clearance', () => {
  const onHeightChange = jest.fn();
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<WorkoutRestFooter onHeightChange={onHeightChange}><Text>Rest</Text></WorkoutRestFooter>);
  });
  const footer = renderer.root.findByProps({ testID: 'workout-rest-footer' });
  act(() => footer.props.onLayout({ nativeEvent: { layout: { height: 72 } } }));
  expect(onHeightChange).toHaveBeenCalledWith(72);
  act(() => renderer.unmount());
  expect(onHeightChange).toHaveBeenLastCalledWith(0);
});
