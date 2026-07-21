import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { getStatusColors, getStatusLabel } from '@/utils/format';

type BadgeVariant = 'pago' | 'parcial' | 'pendente' | 'info' | 'default';

interface BadgeProps {
  label?: string;
  variant?: BadgeVariant;
  status?: string;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', status, style }: BadgeProps) {
  const { colors, fontSize, fontWeight, radius } = useTheme();

  let bg: string;
  let text: string;
  let displayLabel = label ?? '';

  if (status) {
    const sc = getStatusColors(status, colors);
    bg = sc.bg;
    text = sc.text;
    displayLabel = label ?? getStatusLabel(status);
  } else {
    switch (variant) {
      case 'info':
        bg = colors.infoLight;
        text = colors.info;
        break;
      default:
        bg = colors.surfaceSecondary;
        text = colors.textSecondary;
    }
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderRadius: radius.full,
          paddingHorizontal: 10,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: text,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
          letterSpacing: 0.3,
        }}
      >
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
});