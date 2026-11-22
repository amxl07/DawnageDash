import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'text' | 'destructive';
export type ButtonContext = 'content' | 'floating';
export type ButtonSize = 'compact' | 'regular' | 'large';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  context?: ButtonContext;
  size?: ButtonSize;
  accessibilityHint?: string;
  testID?: string;
};
