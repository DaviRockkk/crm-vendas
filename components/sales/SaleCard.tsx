import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Badge } from '@/components/ui/Badge';
import type { Sale } from '@/types';
import { formatCurrency, formatDate, daysUntilDue, getSalePaymentInfo } from '@/utils/format';

interface SaleCardProps {
  sale: Sale;
}

export function SaleCard({ sale }: SaleCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const isSmallScreen = screenWidth < 380;
  const isVerySmallScreen = screenWidth < 340;

  const paymentInfo = getSalePaymentInfo(sale);
  const overdue = paymentInfo.isOverdue;
  const activeDueDate = overdue
    ? paymentInfo.overdueDueDate
    : paymentInfo.nextDueDate || sale.due_date;
  const days = daysUntilDue(activeDueDate);

  const clientName = (sale as any).clients?.name ?? 'Cliente';
  const itemsCount = sale.sale_items?.length ?? 0;

  const amountItemsCount =
    1 +
    (sale.paid_amount > 0 ? 1 : 0) +
    (sale.due_amount > 0 ? 1 : 0) +
    (activeDueDate && !paymentInfo.isFullyPaid ? 1 : 0);

  const isFewItems = amountItemsCount <= 2;
  const labelFontSize = isVerySmallScreen ? 9 : isSmallScreen ? 10 : fontSize.xs;
  const valueFontSize = isVerySmallScreen ? 11 : isSmallScreen ? fontSize.sm : fontSize.base;

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
          <Text style={[styles.meta, { color: colors.textSecondary, fontSize: fontSize.sm }]} numberOfLines={1}>
            {itemsCount} {itemsCount === 1 ? 'item' : 'itens'} · {formatDate(sale.created_at)}
          </Text>
        </View>

        <Badge status={paymentInfo.displayStatus} label={paymentInfo.displayStatusLabel} />
      </View>

      {/* Amounts */}
      <View
        style={[
          styles.amounts,
          {
            borderTopColor: colors.border,
            justifyContent: isFewItems ? 'flex-start' : 'space-between',
            gap: isFewItems ? (isSmallScreen ? 24 : 32) : isVerySmallScreen ? 4 : isSmallScreen ? 6 : 10,
          },
        ]}
      >
        <View style={[styles.amountItem, !isFewItems && styles.amountItemFlexible]}>
          <Text
            style={[styles.amountLabel, { color: colors.textTertiary, fontSize: labelFontSize }]}
            numberOfLines={1}
          >
            TOTAL
          </Text>
          <Text
            style={[styles.amountValue, { color: colors.text, fontSize: valueFontSize, fontWeight: fontWeight.semibold }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {formatCurrency(sale.total_amount)}
          </Text>
        </View>

        {sale.paid_amount > 0 && (
          <View style={[styles.amountItem, !isFewItems && styles.amountItemFlexible]}>
            <Text
              style={[styles.amountLabel, { color: colors.textTertiary, fontSize: labelFontSize }]}
              numberOfLines={1}
            >
              PAGO
            </Text>
            <Text
              style={[styles.amountValue, { color: colors.success, fontSize: valueFontSize, fontWeight: fontWeight.semibold }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {formatCurrency(sale.paid_amount)}
            </Text>
          </View>
        )}

        {sale.due_amount > 0 && (
          <View style={[styles.amountItem, !isFewItems && styles.amountItemFlexible]}>
            <Text
              style={[styles.amountLabel, { color: colors.textTertiary, fontSize: labelFontSize }]}
              numberOfLines={1}
            >
              RESTANTE
            </Text>
            <Text
              style={[
                styles.amountValue,
                {
                  color: overdue ? colors.error : colors.warning,
                  fontSize: valueFontSize,
                  fontWeight: fontWeight.bold,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {formatCurrency(sale.due_amount)}
            </Text>
          </View>
        )}

        {activeDueDate && !paymentInfo.isFullyPaid && (
          <View style={[styles.amountItem, !isFewItems && styles.amountItemFlexible]}>
            <Text
              style={[styles.amountLabel, { color: colors.textTertiary, fontSize: labelFontSize }]}
              numberOfLines={1}
            >
              VENCE
            </Text>
            <Text
              style={[
                styles.amountValue,
                {
                  color: overdue ? colors.error : days !== null && days <= 3 ? colors.warning : colors.textSecondary,
                  fontSize: valueFontSize,
                  fontWeight: fontWeight.medium,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {overdue ? 'Vencido' : formatDate(activeDueDate)}
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
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  amountItem: {},
  amountItemFlexible: {
    flex: 1,
  },
  amountLabel: {
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  amountValue: {},
});