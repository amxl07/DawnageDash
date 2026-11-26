import Constants, { ExecutionEnvironment } from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { canUseNativeSurfaces, type NativeSurfaceAdapter } from './model';

export async function loadNativeSurfaceAdapter(): Promise<NativeSurfaceAdapter | null> {
  try {
    const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    // Do not import expo-widgets at all in Expo Go or an older development binary.
    if (expoGo || !canUseNativeSurfaces({ platform: Platform.OS, version: Platform.Version, expoGo, binary: Boolean(requireOptionalNativeModule('ExpoWidgets')) })) return null;
    return (await import('./widgets.ios')).nativeSurfaceAdapter;
  } catch { return null; }
}
