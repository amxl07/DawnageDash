import { AppSymbolFallback } from './AppSymbolFallback';
import type { AppSymbolProps } from './AppSymbol.types';

export function AppSymbol(props: AppSymbolProps) {
  return <AppSymbolFallback {...props} />;
}

export type { AppSymbolName, AppSymbolProps } from './AppSymbol.types';
