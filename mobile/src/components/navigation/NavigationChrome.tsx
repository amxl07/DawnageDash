import { createContext, useContext } from 'react';

/** Explicit owners prevent screens from guessing tab/header heights. */
export const NativeTabsContext = createContext(false);
export const NativeHeaderContext = createContext(false);
export const useNativeTabs = () => useContext(NativeTabsContext);
export const useNativeHeader = () => useContext(NativeHeaderContext);
