import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

export function Card({ children, style, noPadding = false }: CardProps) {
  const { colors, radius } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: noPadding ? 0 : 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface CardTitleProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: ViewStyle;
}

export function CardTitle({ title, subtitle, right, style }: CardTitleProps) {
  const { colors, fontSize, fontWeight } = useTheme();
  return (
    <View style={[styles.titleRow, style]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {right && right}
    </View>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
}

export function Section({ title, children, style, titleStyle }: SectionProps) {
  const { colors, fontSize, fontWeight } = useTheme();
  return (
    <View style={[{ marginBottom: 20 }, style]}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: colors.textSecondary,
            fontSize: fontSize.xs,
            fontWeight: fontWeight.semibold,
          },
          titleStyle,
        ]}
      >
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
  },
  sectionTitle: {
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
});