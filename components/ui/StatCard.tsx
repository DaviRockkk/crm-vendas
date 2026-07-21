import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency } from '@/utils/format';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentColor?: string;
  isCurrency?: boolean;
  subtitle?: string;
  style?: ViewStyle;
}

export function StatCard({ label, value, icon, accentColor, isCurrency = true, subtitle, style }: StatCardProps) {
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const accent = accentColor ?? colors.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
        },
        style,
      ]}
    >
      <View style={[styles.iconBg, { backgroundColor: accent + '18' }]}>
        {icon}
      </View>
      <Text
        style={[
          styles.value,
          { color: colors.text, fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {isCurrency ? formatCurrency(value) : value.toString()}
      </Text>
      <Text style={[styles.label, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
        {label}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 16,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  label: {
    marginBottom: 2,
  },
  subtitle: {
    marginTop: 2,
  },
});