import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import type { Client } from '@/types';
import { formatPhone } from '@/utils/format';

interface ClientCardProps {
  client: Client;
  totalDue?: number;
}

export function ClientCard({ client, totalDue }: ClientCardProps) {
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const initials = client.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
        },
      ]}
      onPress={() => router.push(`/(tabs)/clients/${client.id}`)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.initials, { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold }]}>
          {initials}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text
          style={[styles.name, { color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.semibold }]}
          numberOfLines={1}
        >
          {client.name}
        </Text>
        {client.phone && (
          <Text style={[styles.phone, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
            {formatPhone(client.phone)}
          </Text>
        )}
      </View>

      {/* Due amount indicator */}
      {totalDue !== undefined && totalDue > 0 && (
        <View style={[styles.debtBadge, { backgroundColor: colors.errorLight }]}>
          <Text style={[styles.debtText, { color: colors.errorText, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDue)}
          </Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initials: {},
  info: {
    flex: 1,
  },
  name: {
    marginBottom: 2,
  },
  phone: {},
  debtBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    marginRight: 8,
  },
  debtText: {},
});