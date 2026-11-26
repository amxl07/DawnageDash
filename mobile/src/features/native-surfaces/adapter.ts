import type { NativeSurfaceAdapter } from './model';

// WidgetKit/ActivityKit have no Android or web implementation. The existing
// in-app logger and rest clock remain fully available on those platforms.
export async function loadNativeSurfaceAdapter(): Promise<NativeSurfaceAdapter | null> { return null; }
