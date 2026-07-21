import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const { colors, radius, fontSize, fontWeight } = useTheme();

  const isDisabled = disabled || loading;

  const sizeStyles: Record<Size, { paddingVertical: number; paddingHorizontal: number; fontSize: number; height: number }> = {
    sm: { paddingVertical: 7, paddingHorizontal: 14, fontSize: fontSize.sm, height: 36 },
    md: { paddingVertical: 12, paddingHorizontal: 20, fontSize: fontSize.base, height: 46 },
    lg: { paddingVertical: 15, paddingHorizontal: 28, fontSize: fontSize.md, height: 54 },
  };

  const variantStyles: Record<Variant, { bg: string; text: string; border?: string }> = {
    primary: { bg: colors.primary, text: '#FFFFFF' },
    secondary: { bg: colors.surfaceSecondary, text: colors.text },
    outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
    ghost: { bg: 'transparent', text: colors.textSecondary },
    danger: { bg: colors.error, text: '#FFFFFF' },
  };

  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1.5 : 0,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          height: s.height,
          borderRadius: radius.md,
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style as ViewStyle,
      ]}
      disabled={isDisabled}
      activeOpacity={0.75}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {icon && icon}
          <Text
            style={[
              styles.label,
              {
                color: v.text,
                fontSize: s.fontSize,
                fontWeight: fontWeight.semibold,
                marginLeft: icon ? 6 : 0,
              } as TextStyle,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    letterSpacing: 0.2,
  },
});