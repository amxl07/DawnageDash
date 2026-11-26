import Constants from 'expo-constants';
import { loadNativeSurfaceAdapter } from './adapter';
import { NativeSurfaceController } from './controller';
import { nativeSurfaceLinks } from './model';

export const nativeSurfaceController = new NativeSurfaceController(loadNativeSurfaceAdapter, () => nativeSurfaceLinks(Constants.expoConfig?.scheme));
