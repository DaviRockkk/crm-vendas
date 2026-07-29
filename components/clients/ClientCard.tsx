import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import type { Client } from '@/types';
import { formatPhone, formatCurrency } from '@/utils/format';

interface ClientCardProps {
  client: Client;
  totalDue?: number;
  totalPaid?: number;
}

export function ClientCard({ client, totalDue: propTotalDue, totalPaid: propTotalPaid }: ClientCardProps) {
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const due = propTotalDue ?? client.totalDue ?? 0;
  const paid = propTotalPaid ?? client.totalPaid ?? 0;
  const hasSales = (client.totalSalesCount ?? 0) > 0 || paid > 0 || due > 0;

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
      <View style={[styles.avatar, { backgroundColor: due > 0 ? colors.errorLight : colors.primaryLight }]}>
        <Text
          style={[
            styles.initials,
            { color: due > 0 ? colors.errorText : colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
          ]}
        >
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
        <View style={styles.subRow}>
          {client.phone ? (
            <Text style={[styles.phone, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
              {formatPhone(client.phone)}
            </Text>
          ) : null}
          {paid > 0 && (
            <Text style={[styles.paidBadgeText, { color: colors.successText, fontSize: fontSize.xs }]}>
              {client.phone ? ' • ' : ''}
              {formatCurrency(paid)} pago
            </Text>
          )}
        </View>
      </View>

      {/* Financial indicator */}
      {due > 0 ? (
        <View style={[styles.debtBadge, { backgroundColor: colors.errorLight }]}>
          <Text style={[styles.debtLabel, { color: colors.errorText, fontSize: 9, fontWeight: fontWeight.bold }]}>
            DEVENDO
          </Text>
          <Text style={[styles.debtAmount, { color: colors.errorText, fontSize: fontSize.xs, fontWeight: fontWeight.extrabold }]}>
            {formatCurrency(due)}
          </Text>
        </View>
      ) : hasSales ? (
        <View style={[styles.statusBadge, { backgroundColor: colors.successLight }]}>
          <Text style={[styles.statusText, { color: colors.successText, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>
            Quitado
          </Text>
        </View>
      ) : (
        <View style={[styles.statusBadge, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.statusText, { color: colors.textTertiary, fontSize: 11 }]}>
            Sem vendas
          </Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
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
    marginRight: 8,
  },
  name: {
    marginBottom: 2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  phone: {},
  paidBadgeText: {
    fontWeight: '500',
  },
  debtBadge: {
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  debtLabel: {
    letterSpacing: 0.5,
  },
  debtAmount: {},
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {},
});