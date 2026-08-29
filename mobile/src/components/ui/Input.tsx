import { forwardRef, useState } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';

import { HIT_SLOP_MIN, iconSize, radius, spacing, type, useTheme } from '@/theme';
import { Text } from './Text';

export type InputProps = Omit<TextInputProps, 'style'> & {
  /** Visible label. Required — placeholder-as-label is banned (§03.A.2). */
  label: string;
  icon?: LucideIcon;
  error?: string | null;
  hint?: string;
  /** Renders a show/hide toggle and manages secureTextEntry. */
  password?: boolean;
  containerStyle?: ViewStyle;
  /** Escape hatch for the inner TextInput (e.g. multiline min-height). */
  inputStyle?: StyleProp<TextStyle>;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, icon: Icon, error, hint, password, containerStyle, inputStyle, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);

  // The boundary is the affordance, so it must clear 3:1 (WCAG 1.4.11).
  const borderColor = error ? colors.destructive : focused ? colors.focusRing : colors.borderStrong;

  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      <Text variant="label" tone="muted">
        {label}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: HIT_SLOP_MIN + 4,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          borderWidth: focused ? 2 : 1,
          borderColor,
          backgroundColor: colors.elevated,
        }}
      >
        {Icon ? (
          <Icon size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
        ) : null}

        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={hint}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={password ? !reveal : rest.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[type.body, { flex: 1, color: colors.foreground, paddingVertical: spacing.md }, inputStyle]}
          {...rest}
        />

        {password ? (
          <Pressable
            onPress={() => setReveal((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
          >
            {reveal ? (
              <EyeOff size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} />
            ) : (
              <Eye size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} />
            )}
          </Pressable>
        ) : null}
      </View>

      {/* Errors sit under the field they belong to, in words. */}
      {error ? (
        <Text variant="bodySm" tone="primary" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="bodySm" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
