import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  BackHandler,
  Share,
  Linking,
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
import { formatCurrency, formatDate, isOverdue, getStatusLabel, maskCurrency, parseCurrency, calculateInstallmentsDetail, getWhatsAppUrl } from '@/utils/format';
import { confirmAction, showAlert, showError } from '@/utils/alert';
import type { SaleStatus } from '@/types';

const STATUS_OPTIONS: SaleStatus[] = ['pendente', 'pago'];

export default function SaleDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    if (!from) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.navigate(from as any);
      return true;
    });
    return () => subscription.remove();
  }, [from, router]);

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
        showAlert('Atenção', 'Informe um valor a adicionar válido.', 'warning');
        return;
      }
      finalPaid = Math.min(sale.total_amount, sale.paid_amount + added);
    } else {
      const edited = parseCurrency(totalPaidAmount);
      if (isNaN(edited) || edited < 0) {
        showAlert('Atenção', 'Informe um valor total pago válido.', 'warning');
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

  function generateScheduleText() {
    if (!sale) return '';
    const clientName = client?.name ?? 'Cliente';
    const totalStr = formatCurrency(sale.total_amount);
    const paidStr = formatCurrency(sale.paid_amount);
    const dueStr = formatCurrency(sale.due_amount);

    const installmentDetails = calculateInstallmentsDetail(
      sale.total_amount,
      sale.paid_amount,
      sale.installments || 1,
      new Date(sale.created_at)
    );

    let message = `📋 *CRONOGRAMA DE PAGAMENTO*\n`;
    message += `👤 *Cliente:* ${clientName}\n`;
    message += `💰 *Valor Total:* ${totalStr}\n`;
    message += `✅ *Valor Pago:* ${paidStr}\n`;
    if (sale.status !== 'pago') {
      message += `⚠️ *Saldo Pendente:* ${dueStr}\n`;
    }
    message += `\n📅 *PARCELAS (${sale.installments || 1}x):*\n`;

    installmentDetails.forEach((inst) => {
      const statusIcon = inst.status === 'pago' ? '✅' : inst.status === 'parcial' ? '🟡' : '⏳';
      const statusText =
        inst.status === 'pago'
          ? 'Pago'
          : inst.status === 'parcial'
          ? `Parcial (${formatCurrency(inst.paid)})`
          : 'Pendente';
      message += `${statusIcon} *${inst.number}ª Parcela:* ${formatCurrency(inst.total)}\n`;
      message += `   • Vencimento: ${formatDate(inst.dueDate)}\n`;
      message += `   • Status: ${statusText}\n`;
      if (inst.status === 'parcial' && inst.remaining > 0) {
        message += `   • Restante: ${formatCurrency(inst.remaining)}\n`;
      }
      message += `\n`;
    });

    if (sale.sale_items && sale.sale_items.length > 0) {
      message += `📦 *ITENS DA VENDA:*\n`;
      sale.sale_items.forEach((item: any) => {
        message += `• ${item.quantity}x ${item.product_name} (${formatCurrency(item.unit_price)})\n`;
      });
    }

    return message.trim();
  }

  async function handleShareSchedule() {
    const text = generateScheduleText();
    if (!text) return;
    try {
      await Share.share({
        message: text,
        title: `Cronograma de Parcelas - ${client?.name ?? 'Cliente'}`,
      });
    } catch (error) {
      showError('Erro', 'Não foi possível compartilhar o cronograma.');
    }
  }

  async function handleWhatsAppShare() {
    const text = generateScheduleText();
    if (!text) return;
    const url = getWhatsAppUrl(client?.phone, text);
    if (!url) {
      handleShareSchedule();
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Share.share({ message: text });
      }
    } catch (error) {
      await Share.share({ message: text });
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header
        title="Detalhe da Venda"
        showBack
        onBack={from ? () => router.navigate(from as any) : undefined}
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
                <TouchableOpacity onPress={() => router.push({ pathname: `/(tabs)/clients/${sale.client_id}` as any, params: { from: `/(tabs)/sales/${sale.id}` } })}>
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

            {sale.installments && sale.installments > 1 && (
              <View style={{ marginTop: 10, padding: 10, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md }}>
                <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
                  Parcelado em {sale.installments}x sem juros
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
                  Valor da Parcela: {formatCurrency(sale.total_amount / sale.installments)}
                </Text>
              </View>
            )}

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

          {/* Cronograma de Parcelas */}
          {(() => {
            const installmentDetails = calculateInstallmentsDetail(
              sale.total_amount,
              sale.paid_amount,
              sale.installments || 1,
              new Date(sale.created_at)
            );

            return (
              <Card style={styles.card}>
                <CardTitle
                  title="Cronograma de Parcelas"
                  subtitle={`${sale.installments || 1}x de ${formatCurrency(sale.total_amount / (sale.installments || 1))}`}
                  right={
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.primaryLight,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: radius.full,
                      }}
                      onPress={handleShareSchedule}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="share-social-outline" size={14} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginLeft: 4 }}>
                        Compartilhar
                      </Text>
                    </TouchableOpacity>
                  }
                />

                <View style={{ gap: 10, marginTop: 4 }}>
                  {installmentDetails.map((inst) => {
                    const isPaid = inst.status === 'pago';
                    const isPartial = inst.status === 'parcial';
                    const color = isPaid ? colors.success : isPartial ? colors.primary : colors.textTertiary;
                    const statusLabel = isPaid
                      ? 'Pago ✓'
                      : isPartial
                      ? `Parcial (${inst.percentage.toFixed(0)}%)`
                      : 'Pendente';

                    return (
                      <View
                        key={inst.number}
                        style={{
                          padding: 12,
                          borderRadius: radius.md,
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: isPaid ? colors.success + '40' : isPartial ? colors.primary + '40' : colors.border,
                          borderWidth: 1,
                        }}
                      >
                        {/* Header line */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons
                              name={isPaid ? 'checkmark-circle' : isPartial ? 'time' : 'ellipse-outline'}
                              size={18}
                              color={color}
                            />
                            <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
                              {inst.number}ª Parcela
                            </Text>
                          </View>

                          <View
                            style={{
                              backgroundColor: isPaid ? colors.successLight : isPartial ? colors.primaryLight : colors.border + '40',
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: radius.full,
                            }}
                          >
                            <Text style={{ color: color, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>
                              {statusLabel}
                            </Text>
                          </View>
                        </View>

                        {/* Due date & values line */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 6 }}>
                          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                            Vence em: <Text style={{ fontWeight: fontWeight.semibold }}>{formatDate(inst.dueDate)}</Text>
                          </Text>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: colors.text, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                              {formatCurrency(inst.paid)} / {formatCurrency(inst.total)}
                            </Text>
                            {isPartial && (
                              <Text style={{ color: colors.error, fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: 2 }}>
                                Falta: {formatCurrency(inst.remaining)}
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Download-style Progress Bar */}
                        <View
                          style={{
                            height: 8,
                            backgroundColor: colors.border,
                            borderRadius: 4,
                            overflow: 'hidden',
                            marginTop: 8,
                          }}
                        >
                          <View
                            style={{
                              height: '100%',
                              width: `${inst.percentage}%`,
                              backgroundColor: isPaid ? colors.success : isPartial ? colors.primary : colors.textTertiary,
                              borderRadius: 4,
                            }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Bottom Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderWidth: 1,
                      paddingVertical: 10,
                      borderRadius: radius.md,
                      gap: 6,
                    }}
                    onPress={handleShareSchedule}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-outline" size={16} color={colors.text} />
                    <Text style={{ color: colors.text, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                      Compartilhar Texto
                    </Text>
                  </TouchableOpacity>

                  {client?.phone ? (
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#25D366',
                        paddingVertical: 10,
                        borderRadius: radius.md,
                        gap: 6,
                      }}
                      onPress={handleWhatsAppShare}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
                      <Text style={{ color: '#FFF', fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>
                        Enviar no WhatsApp
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </Card>
            );
          })()}

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
                  label={s === 'pago' ? 'Marcar como Pago' : getStatusLabel(s)}
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