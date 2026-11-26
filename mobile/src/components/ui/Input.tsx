import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useState, type ComponentRef } from 'react';
import {
  Platform,
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
  /** A visible unit outside the editable text, e.g. kg or kcal. */
  suffix?: string;
  /** Renders a show/hide toggle and manages secureTextEntry. */
  password?: boolean;
  containerStyle?: ViewStyle;
  /** Escape hatch for the inner TextInput (e.g. multiline min-height). */
  inputStyle?: StyleProp<TextStyle>;
  /** Registers focus with a native Gorhom sheet while retaining the ordinary web input. */
  sheetAware?: boolean;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, icon: Icon, error, hint, suffix, password, containerStyle, inputStyle, sheetAware = false, onFocus, onBlur, secureTextEntry, accessibilityLabel = label, accessibilityHint = [hint, suffix ? `Unit: ${suffix}` : undefined].filter(Boolean).join('. ') || undefined, placeholderTextColor, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const handleFocus: NonNullable<TextInputProps['onFocus']> = (event) => { setFocused(true); onFocus?.(event); };
  const handleBlur: NonNullable<TextInputProps['onBlur']> = (event) => { setFocused(false); onBlur?.(event); };
  const handleSheetRef = useCallback((node: ComponentRef<typeof BottomSheetTextInput> | null) => {
    const textInput: TextInput | null = node ?? null;
    if (typeof ref === 'function') ref(textInput);
    else if (ref) ref.current = textInput;
  }, [ref]);

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
          borderRadius: radius.input,
          borderWidth: 1,
          borderColor,
          backgroundColor: colors.elevated,
        }}
      >
        {Icon ? (
          <Icon size={iconSize.md} color={colors.mutedForeground} strokeWidth={2} accessible={false} />
        ) : null}

        {sheetAware && Platform.OS !== 'web' ? <BottomSheetTextInput
          ref={handleSheetRef}
          {...rest}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          placeholderTextColor={placeholderTextColor ?? colors.mutedForeground}
          secureTextEntry={password ? !reveal : secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[type.body, { flex: 1, minWidth: 0, color: colors.foreground, paddingVertical: spacing.md }, inputStyle]}
        /> : <TextInput
          ref={ref}
          {...rest}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          placeholderTextColor={placeholderTextColor ?? colors.mutedForeground}
          secureTextEntry={password ? !reveal : secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[type.body, { flex: 1, minWidth: 0, color: colors.foreground, paddingVertical: spacing.md }, inputStyle]}
        />}

        {suffix ? <Text variant="bodySm" tone="muted" accessible={false}>{suffix}</Text> : null}

        {password ? (
          <Pressable
            onPress={() => setReveal((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
            style={({ pressed }) => ({
              minWidth: HIT_SLOP_MIN,
              minHeight: HIT_SLOP_MIN,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              backgroundColor: pressed ? colors.pressed : 'transparent',
            })}
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
        <Text variant="bodySm" tone="destructive" accessibilityLiveRegion="polite">
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
