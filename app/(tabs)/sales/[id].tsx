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
import { confirmAction } from '@/utils/alert';
import type { SaleStatus } from '@/types';

const STATUS_OPTIONS: SaleStatus[] = ['pendente', 'pago'];

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: sale, isLoading } = useSale(id);
  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'add' | 'edit'>('add');
  const [addAmount, setAddAmount] = useState('');
  const [totalPaidAmount, setTotalPaidAmount] = useState('');

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!sale) return null;

  const client = (sale as any).clients;
  const overdue = sale.status !== 'pago' && isOverdue(sale.due_date);

  function openModal() {
    setPaymentMode('add');
    setAddAmount('');
    setTotalPaidAmount(maskCurrency(Math.round(sale!.paid_amount * 100).toString()));
    setShowPaymentModal(true);
  }

  async function handleStatusChange(newStatus: SaleStatus) {
    if (!sale) return;
    let newPaid = sale.paid_amount;
    let newDue = sale.due_amount;

    if (newStatus === 'pago') {
      newPaid = sale.total_amount;
      newDue = 0;
    } else if (newStatus === 'pendente') {
      newPaid = 0;
      newDue = sale.total_amount;
    }

    await updateSale.mutateAsync({
      id,
      status: newStatus,
      paid_amount: newPaid,
      due_amount: newDue,
    });
  }

  async function handleUpdatePayment() {
    if (!sale) return;
    let finalPaid = 0;

    if (paymentMode === 'add') {
      const added = parseCurrency(addAmount);
      if (isNaN(added) || added <= 0) {
        Alert.alert('Atenção', 'Informe um valor a adicionar válido.');
        return;
      }
      finalPaid = Math.min(sale.total_amount, sale.paid_amount + added);
    } else {
      const edited = parseCurrency(totalPaidAmount);
      if (isNaN(edited) || edited < 0) {
        Alert.alert('Atenção', 'Informe um valor total pago válido.');
        return;
      }
      finalPaid = Math.min(sale.total_amount, edited);
    }

    const newDue = Math.max(0, sale.total_amount - finalPaid);
    const newStatus: SaleStatus =
      finalPaid >= sale.total_amount ? 'pago' : finalPaid > 0 ? 'parcial' : 'pendente';

    await updateSale.mutateAsync({
      id,
      paid_amount: finalPaid,
      due_amount: newDue,
      status: newStatus,
    });
    setShowPaymentModal(false);
  }

  async function handleDelete() {
    confirmAction({
      title: 'Excluir Venda',
      message: 'Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      onConfirm: async () => {
        await deleteSale.mutateAsync(id);
        router.back();
      },
    });
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header
        title="Detalhe da Venda"
        showBack
        onBack={() => router.replace('/(tabs)/sales')}
      />

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
              {sale.status !== 'pago' && (
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
              )}
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
          <Card style={styles.card}>
            <CardTitle title="Ações Rápidas" />

            <Button
              label="Editar / Registrar Pagamento"
              onPress={openModal}
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
                  label={s === 'pago' ? 'Marcar como Pago (Total)' : getStatusLabel(s)}
                  variant={s === 'pago' ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => handleStatusChange(s)}
                  loading={updateSale.isPending}
                  style={{ flex: 1 }}
                />
              ))}
            </View>
          </Card>

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
          <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: 16 }}>
            Registrar / Editar Pagamento
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                {
                  borderColor: paymentMode === 'add' ? colors.primary : colors.border,
                  backgroundColor: paymentMode === 'add' ? colors.primaryLight : colors.surfaceSecondary,
                },
              ]}
              onPress={() => setPaymentMode('add')}
            >
              <Text
                style={{
                  color: paymentMode === 'add' ? colors.primary : colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.bold,
                }}
              >
                + Adicionar valor
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                {
                  borderColor: paymentMode === 'edit' ? colors.primary : colors.border,
                  backgroundColor: paymentMode === 'edit' ? colors.primaryLight : colors.surfaceSecondary,
                },
              ]}
              onPress={() => setPaymentMode('edit')}
            >
              <Text
                style={{
                  color: paymentMode === 'edit' ? colors.primary : colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.bold,
                }}
              >
                Editar total pago
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md }]}>
            <View style={styles.infoRow}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Total da Venda:</Text>
              <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
                {formatCurrency(sale.total_amount)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Já Pago até agora:</Text>
              <Text style={{ color: colors.success, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
                {formatCurrency(sale.paid_amount)}
              </Text>
            </View>
            {sale.due_amount > 0 && (
              <View style={styles.infoRow}>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Falta Pagar:</Text>
                <Text style={{ color: colors.error, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
                  {formatCurrency(sale.due_amount)}
                </Text>
              </View>
            )}
          </View>

          {paymentMode === 'add' ? (
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                Valor adicional recebido agora (ex: parcelas, entradas):
              </Text>
              <TextInput
                style={[
                  styles.payInput,
                  { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.text, borderRadius: radius.md },
                ]}
                value={addAmount}
                onChangeText={(v) => setAddAmount(maskCurrency(v))}
                placeholder="0,00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                autoFocus
              />
              {parseCurrency(addAmount) > 0 && (
                <Text style={{ color: colors.primary, fontSize: fontSize.xs, marginTop: 6, fontWeight: fontWeight.medium }}>
                  Novo Total Pago será:{' '}
                  {formatCurrency(Math.min(sale.total_amount, sale.paid_amount + parseCurrency(addAmount)))}
                </Text>
              )}
            </View>
          ) : (
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                Ajustar o valor total acumulado já pago:
              </Text>
              <TextInput
                style={[
                  styles.payInput,
                  { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.text, borderRadius: radius.md },
                ]}
                value={totalPaidAmount}
                onChangeText={(v) => setTotalPaidAmount(maskCurrency(v))}
                placeholder="0,00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                autoFocus
              />
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
            <Button label="Salvar Pagamento" onPress={handleUpdatePayment} loading={updateSale.isPending} style={{ flex: 1 }} size="lg" />
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
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoBox: {
    padding: 12,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});