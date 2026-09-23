import type { StyleProp, ViewStyle } from 'react-native';

import type { AppSymbolName } from './AppSymbol.types';

export type ToolbarActionProps = {
  label: string;
  symbol: AppSymbolName;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};
