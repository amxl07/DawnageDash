import { Children, isValidElement } from 'react';
import { View, type ViewProps } from 'react-native';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { spacing } from '@/theme';

type Props = ViewProps & { minItemWidth?: number; gap?: number };

export function AdaptiveGrid({ children, minItemWidth = 156, gap = spacing.md, style, ...rest }: Props) {
  const { isCompact } = useResponsiveLayout();

  return (
    <View
      style={[{ flexDirection: isCompact ? 'column' : 'row', flexWrap: 'wrap', gap }, style]}
      {...rest}
    >
      {Children.toArray(children).map((child, index) => (
        <View
          key={isValidElement(child) && child.key != null ? child.key : `adaptive-grid-item-${index}`}
          style={{ flexGrow: 1, flexBasis: isCompact ? '100%' : minItemWidth, minWidth: 0 }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}
