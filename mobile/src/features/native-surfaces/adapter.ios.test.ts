import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { loadNativeSurfaceAdapter } from './adapter.ios';

jest.mock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'storeClient' }, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
jest.mock('expo-modules-core', () => ({
  // Expo's runtime also needs the core exports to install its global fetch.
  ...jest.requireActual('expo-modules-core'),
  requireOptionalNativeModule: jest.fn(),
}));
const mockLoaded = jest.fn();
jest.mock('./widgets.ios', () => { mockLoaded(); return { nativeSurfaceAdapter: { initialize: () => {}, getInstances: () => [], start: () => { throw new Error('disabled'); } } }; });
const initialOS = Platform.OS;
const initialVersion = Platform.Version;
beforeEach(() => { jest.clearAllMocks(); Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true }); Object.defineProperty(Platform, 'Version', { value: '26.0', configurable: true }); });
afterEach(() => { Object.defineProperty(Platform, 'OS', { value: initialOS, configurable: true }); Object.defineProperty(Platform, 'Version', { value: initialVersion, configurable: true }); });
it('avoids evaluating the widget module in Expo Go and an old binary', async () => {
  Constants.executionEnvironment = 'storeClient' as typeof Constants.executionEnvironment;
  expect(await loadNativeSurfaceAdapter()).toBeNull();
  Constants.executionEnvironment = 'bare' as typeof Constants.executionEnvironment;
  jest.mocked(requireOptionalNativeModule).mockReturnValue(null);
  expect(await loadNativeSurfaceAdapter()).toBeNull();
  expect(mockLoaded).not.toHaveBeenCalled();
});
it('contains absent native module and old OS failures', async () => {
  Constants.executionEnvironment = 'bare' as typeof Constants.executionEnvironment;
  jest.mocked(requireOptionalNativeModule).mockImplementation(() => { throw new Error('native load failed'); });
  expect(await loadNativeSurfaceAdapter()).toBeNull();
  jest.mocked(requireOptionalNativeModule).mockReturnValue({} as never);
  Object.defineProperty(Platform, 'Version', { value: '16.1', configurable: true });
  expect(await loadNativeSurfaceAdapter()).toBeNull();
  expect(mockLoaded).not.toHaveBeenCalled();
});
