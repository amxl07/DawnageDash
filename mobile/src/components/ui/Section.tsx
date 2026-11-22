import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { spacing } from '@/theme';
import { Text } from './Text';

export type SectionProps = Omit<ViewProps, 'style'> & {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Section({ title, subtitle, action, children, style, ...rest }: SectionProps) {
  const hasHeader = title !== undefined || subtitle !== undefined || action !== undefined;
  return (
    <View style={[styles.section, style]} {...rest}>
      {hasHeader ? (
        <View style={styles.header}>
          <View style={styles.heading}>
            {title ? <Text variant="h2" accessibilityRole="header">{title}</Text> : null}
            {subtitle ? <Text variant="bodySm" tone="muted">{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: 'transparent', gap: spacing.md },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  heading: { minWidth: 0, flexGrow: 1, flexShrink: 1, gap: spacing.xs },
});
