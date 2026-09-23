import type { StyleProp, ViewStyle } from 'react-native';

export type AppSymbolName =
  | 'home'
  | 'checkIn'
  | 'training'
  | 'nutrition'
  | 'profile'
  | 'back'
  | 'close'
  | 'history'
  | 'overflow'
  | 'calendar'
  | 'completion';

export type AppSymbolProps = {
  name: AppSymbolName;
  selected?: boolean;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};
