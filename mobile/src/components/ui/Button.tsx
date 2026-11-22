import { ButtonFallback } from './ButtonFallback';
import type { ButtonProps } from './Button.types';

export function Button(props: ButtonProps) {
  return <ButtonFallback {...props} />;
}

export type { ButtonContext, ButtonProps, ButtonSize, ButtonVariant } from './Button.types';
