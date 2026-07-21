import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSale, useUpdateSale, useDeleteSale } from '@/hooks/useSales';
import { useTheme } from '@/hooks/useTheme';
import { Header } from '@/components/ui/Header';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatDate, isOverdue, getStatusLabel, maskCurrency, parseCurrency } from '@/utils/format';
import type { SaleStatus } from '@/types';

const STATUS_OPTIONS: SaleStatus[] = ['pendente', 'parcial', 'pago'];

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: sale, isLoading } = useSale(id);
  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPaidAmount, setNewPaidAmount] = useState('');

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!sale) return null;

  const client = (sale as any).clients;
  const overdue = sale.status !== 'pago' && isOverdue(sale.due_date);

  async function handleStatusChange(newStatus: SaleStatus) {
    await updateSale.mutateAsync({ id, status: newStatus });
  }

  async function handleUpdatePayment() {
    if (!sale) return;
    const amount = parseCurrency(newPaidAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Atenção', 'Informe um valor válido.');
      return;
    }
    const newDue = Math.max(0, sale.total_amount - amount);
    const newStatus: SaleStatus =
      amount >= sale.total_amount ? 'pago' : amount > 0 ? 'parcial' : 'pendente';

    await updateSale.mutateAsync({
      id,
      paid_amount: amount,
      due_amount: newDue,
      status: newStatus,
    });
    setShowPaymentModal(false);
    setNewPaidAmount('');
  }

  async function handleDelete() {
    Alert.alert(
      'Excluir Venda',
      'Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteSale.mutateAsync(id);
            router.back();
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header title="Detalhe da Venda" showBack />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        {overdue && (
          <View style={[styles.banner, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="warning" size={16} color={colors.error} />
            <Text style={{ color: colors.errorText, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginLeft: 8 }}>
              Pagamento vencido em {formatDate(sale.due_date)}
            </Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Summary Card */}
          <Card style={styles.card}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Cliente</Text>
                <TouchableOpacity onPress={() => router.push(`/(tabs)/clients/${sale.client_id}`)}>
                  <Text style={{ color: colors.primary, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>
                    {client?.name ?? 'Desconhecido'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Badge status={sale.status} />
            </View>

            <Text style={{ color: colors.textTertiary, fontSize: fontSize.sm }}>
              Criada em {formatDate(sale.created_at)}
              {sale.due_date ? ` · Vence ${formatDate(sale.due_date)}` : ''}
            </Text>

            <View style={[styles.amountsGrid, { borderTopColor: colors.border, marginTop: 16 }]}>
              <View style={styles.amountCell}>
                <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, letterSpacing: 0.5 }}>TOTAL</Text>
                <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: 4 }}>
                  {formatCurrency(sale.total_amount)}
                </Text>
              </View>
              <View style={[styles.amountCell, { borderLeftColor: colors.border, borderLeftWidth: 1 }]}>
                <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, letterSpacing: 0.5 }}>PAGO</Text>
                <Text style={{ color: colors.success, fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: 4 }}>
                  {formatCurrency(sale.paid_amount)}
                </Text>
              </View>
              <View style={[styles.amountCell, { borderLeftColor: colors.border, borderLeftWidth: 1 }]}>
                <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, letterSpacing: 0.5 }}>RESTANTE</Text>
                <Text
                  style={{
                    color: sale.due_amount > 0 ? colors.error : colors.success,
                    fontSize: fontSize.xl,
                    fontWeight: fontWeight.bold,
                    marginTop: 4,
                  }}
                >
                  {formatCurrency(sale.due_amount)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Items */}
          <Card style={StyleSheet.flatten([styles.card, { padding: 0 }])} noPadding>
            <View style={{ padding: 16, paddingBottom: 4 }}>
              <CardTitle title="Itens da Venda" subtitle={`${sale.sale_items?.length ?? 0} item(s)`} />
            </View>
            {(sale.sale_items ?? []).map((item, idx) => (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  { borderTopColor: colors.border, borderTopWidth: idx === 0 ? 0 : 1 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.medium }}>
                    {item.product_name}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                    {item.quantity}x {formatCurrency(item.unit_price)}
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
                  {formatCurrency(item.unit_price * item.quantity)}
                </Text>
              </View>
            ))}
          </Card>

          {/* Actions */}
          {sale.status !== 'pago' && (
            <Card style={styles.card}>
              <CardTitle title="Ações Rápidas" />

              <Button
                label="Registrar Pagamento"
                onPress={() => { setNewPaidAmount(maskCurrency(Math.round(sale.paid_amount * 100).toString())); setShowPaymentModal(true); }}
                fullWidth
                icon={<Ionicons name="cash-outline" size={18} color="#FFF" />}
                style={{ marginBottom: 10 }}
              />

              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: 8 }}>
                Alterar status:
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {STATUS_OPTIONS.filter((s) => s !== sale.status).map((s) => (
                  <Button
                    key={s}
                    label={getStatusLabel(s)}
                    variant={s === 'pago' ? 'primary' : 'outline'}
                    size="sm"
                    onPress={() => handleStatusChange(s)}
                    loading={updateSale.isPending}
                    style={{ flex: 1 }}
                  />
                ))}
              </View>
            </Card>
          )}

          {/* Delete */}
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.error }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={{ color: colors.error, fontSize: fontSize.base, fontWeight: fontWeight.medium, marginLeft: 8 }}>
              Excluir Venda
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: 20 }}>
            Registrar Pagamento
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: 4 }}>
            Total da venda: {formatCurrency(sale.total_amount)}
          </Text>
          <TextInput
            style={[styles.payInput, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.text, borderRadius: radius.md }]}
            value={newPaidAmount}
            onChangeText={(v) => setNewPaidAmount(maskCurrency(v))}
            placeholder="0,00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Button label="Confirmar" onPress={handleUpdatePayment} loading={updateSale.isPending} style={{ flex: 1 }} size="lg" />
            <Button label="Cancelar" variant="outline" onPress={() => setShowPaymentModal(false)} style={{ flex: 1 }} size="lg" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 4 },
  content: { padding: 16 },
  card: { marginBottom: 12 },
  summaryHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  amountsGrid: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 16 },
  amountCell: { flex: 1, paddingHorizontal: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  modal: { flex: 1, padding: 24, paddingTop: 40 },
  payInput: { borderWidth: 1.5, padding: 14, fontSize: 18, marginTop: 8 },
});