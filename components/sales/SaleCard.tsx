import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Badge } from '@/components/ui/Badge';
import type { Sale } from '@/types';
import { formatCurrency, formatDate, isOverdue, daysUntilDue } from '@/utils/format';

interface SaleCardProps {
  sale: Sale;
}

export function SaleCard({ sale }: SaleCardProps) {
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const router = useRouter();
  const overdue = sale.status !== 'pago' && isOverdue(sale.due_date);
  const days = daysUntilDue(sale.due_date);

  const clientName = (sale as any).clients?.name ?? 'Cliente';
  const itemsCount = sale.sale_items?.length ?? 0;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: overdue ? colors.error + '55' : colors.border,
          borderRadius: radius.lg,
        },
      ]}
      onPress={() => router.push(`/(tabs)/sales/${sale.id}`)}
      activeOpacity={0.7}
    >
      {/* Header row */}
      <View style={styles.row}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="receipt-outline" size={18} color={colors.primary} />
          </View>
        </View>

        <View style={styles.info}>
          <Text
            style={[styles.client, { color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.semibold }]}
            numberOfLines={1}
          >
            {clientName}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
            {itemsCount} {itemsCount === 1 ? 'item' : 'itens'} · {formatDate(sale.created_at)}
          </Text>
        </View>

        <Badge status={sale.status} />
      </View>

      {/* Amounts */}
      <View style={[styles.amounts, { borderTopColor: colors.border }]}>
        <View style={styles.amountItem}>
          <Text style={[styles.amountLabel, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
            TOTAL
          </Text>
          <Text style={[styles.amountValue, { color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.semibold }]}>
            {formatCurrency(sale.total_amount)}
          </Text>
        </View>

        {sale.paid_amount > 0 && (
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
              PAGO
            </Text>
            <Text style={[styles.amountValue, { color: colors.success, fontSize: fontSize.base, fontWeight: fontWeight.semibold }]}>
              {formatCurrency(sale.paid_amount)}
            </Text>
          </View>
        )}

        {sale.due_amount > 0 && (
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
              RESTANTE
            </Text>
            <Text
              style={[
                styles.amountValue,
                {
                  color: overdue ? colors.error : colors.warning,
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.bold,
                },
              ]}
            >
              {formatCurrency(sale.due_amount)}
            </Text>
          </View>
        )}

        {sale.due_date && sale.status !== 'pago' && (
          <View style={styles.amountItem}>
            <Text style={[styles.amountLabel, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
              VENCE
            </Text>
            <Text
              style={[
                styles.amountValue,
                {
                  color: overdue ? colors.error : days !== null && days <= 3 ? colors.warning : colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.medium,
                },
              ]}
            >
              {overdue ? 'Vencido' : formatDate(sale.due_date)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  client: {
    marginBottom: 2,
  },
  meta: {},
  amounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 16,
  },
  amountItem: {},
  amountLabel: {
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  amountValue: {},
});