import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface LoadingSpinnerProps {
  label?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ label, fullScreen = false }: LoadingSpinnerProps) {
  const { colors, fontSize } = useTheme();

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  fullScreen: {
    flex: 1,
  },
  label: {
    marginTop: 12,
  },
});