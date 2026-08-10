import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  BackHandler,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useClient, useDeleteClient } from '@/hooks/useClients';
import { useSalesByClient } from '@/hooks/useSales';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useTheme } from '@/hooks/useTheme';
import { Header } from '@/components/ui/Header';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, getWhatsAppUrl, calculateInstallmentsDetail, isOverdue, getSalePaymentInfo } from '@/utils/format';
import { confirmAction } from '@/utils/alert';
import type { Sale } from '@/types';

export default function ClientDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { colors, fontSize, fontWeight, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  React.useEffect(() => {
    if (!from) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.navigate(from as any);
      return true;
    });
    return () => subscription.remove();
  }, [from, router]);

  const { data: client, isLoading, refetch: refetchClient } = useClient(id);
  const { data: sales = [], refetch: refetchSales } = useSalesByClient(id);
  useRefreshOnFocus(refetchClient);
  useRefreshOnFocus(refetchSales);
  const deleteClient = useDeleteClient();

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!client) return null;

  const totalDue = sales.filter(s => s.status !== 'pago').reduce((acc, s) => acc + s.due_amount, 0);
  const totalPaid = sales.reduce((acc, s) => acc + s.paid_amount, 0);
  const totalAmount = sales.reduce((acc, s) => acc + s.total_amount, 0);

  const whatsappUrl = getWhatsAppUrl(client.phone);

  async function handleDelete() {
    if (!client) return;
    confirmAction({
      title: 'Excluir Cliente',
      message: `Tem certeza que deseja excluir "${client.name}"? Todas as vendas associadas também serão removidas.`,
      confirmText: 'Excluir',
      onConfirm: async () => {
        await deleteClient.mutateAsync(id);
        router.back();
      },
    });
  }

  function generateUnifiedScheduleText(monthlyGroups: any[]) {
    if (!client) return '';
    const totalDueFormatted = formatCurrency(totalDue);

    let message = `📋 *PARCELAS UNIFICADAS POR MÊS*\n`;
    message += `👤 *Cliente:* ${client.name}\n`;
    message += `⚠️ *Dívida Total a Receber:* ${totalDueFormatted}\n\n`;

    if (monthlyGroups.length === 0) {
      message += `🎉 Nenhuma parcela pendente nos próximos meses!\n`;
    } else {
      message += `📅 *RESUMO DOS VENCIMENTOS:*\n\n`;
      monthlyGroups.forEach((group: any) => {
        message += `🗓️ *Vencimento: ${formatDate(group.dueDate)}*\n`;
        message += `   • Valor Pendente no Mês: ${formatCurrency(group.totalDue)}\n`;
        message += `   • ${group.itemsCount} parcela(s):\n`;

        group.salesDetails.forEach((item: any) => {
          const partialTag = item.isPartial ? ' (Parcial)' : '';
          message += `     - Parcela ${item.instNum}/${item.totalInst}: ${formatCurrency(item.remaining)}${partialTag}\n`;
        });

        message += `\n`;
      });
    }

    return message.trim();
  }

  async function handleShareUnifiedSchedule(monthlyGroups: any[]) {
    const text = generateUnifiedScheduleText(monthlyGroups);
    if (!text) return;
    try {
      await Share.share({
        message: text,
        title: `Parcelas Unificadas - ${client?.name ?? 'Cliente'}`,
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar as parcelas.');
    }
  }

  async function handleWhatsAppShareUnified(monthlyGroups: any[]) {
    const text = generateUnifiedScheduleText(monthlyGroups);
    if (!text) return;
    const url = getWhatsAppUrl(client?.phone, text);
    if (!url) {
      handleShareUnifiedSchedule(monthlyGroups);
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

  const initials = client.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header
        title="Detalhe do Cliente"
        showBack
        onBack={from ? () => router.navigate(from as any) : undefined}
        right={
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.primaryLight }]}
            onPress={() => router.push({ pathname: '/(tabs)/clients/new', params: { id } })}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.initials, { color: colors.primary, fontSize: fontSize['2xl'], fontWeight: fontWeight.bold }]}>
              {initials}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}>
            {client.name}
          </Text>
          <Text style={[styles.since, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
            Cliente desde {formatDate(client.created_at)}
          </Text>

          {/* Action buttons */}
          <View style={styles.actions}>
            {whatsappUrl && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
                onPress={() => Linking.openURL(whatsappUrl)}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Conversar no WhatsApp</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {/* Financial Summary */}
          <Card style={styles.card}>
            <CardTitle title="Resumo Financeiro" />
            <View style={styles.financialRow}>
              <View style={styles.finItem}>
                <Text
                  style={[styles.finValue, { color: colors.success, fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {formatCurrency(totalPaid)}
                </Text>
                <Text style={[styles.finLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]} numberOfLines={1}>
                  Total Pago
                </Text>
              </View>
              <View style={[styles.finDivider, { backgroundColor: colors.border }]} />
              <View style={styles.finItem}>
                <Text
                  style={[styles.finValue, { color: totalDue > 0 ? colors.error : colors.textSecondary, fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {formatCurrency(totalDue)}
                </Text>
                <Text style={[styles.finLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]} numberOfLines={1}>
                  A Receber
                </Text>
              </View>
              <View style={[styles.finDivider, { backgroundColor: colors.border }]} />
              <View style={styles.finItem}>
                <Text
                  style={[styles.finValue, { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {formatCurrency(totalAmount)}
                </Text>
                <Text style={[styles.finLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]} numberOfLines={1}>
                  Total Geral
                </Text>
              </View>
            </View>
          </Card>

          {/* Parcelas Unificadas por Mês */}
          {(() => {
            interface MonthlyGroup {
              dueDate: string;
              totalAmount: number;
              totalPaid: number;
              totalDue: number;
              percentage: number;
              itemsCount: number;
              salesDetails: { saleId: string; total: number; paid: number; remaining: number; instNum: number; totalInst: number; isPartial: boolean }[];
            }

            const map: Record<string, MonthlyGroup> = {};

            sales.forEach((sale) => {
              if (sale.status === 'pago' || sale.due_amount <= 0) return;

              const details = calculateInstallmentsDetail(
                sale.total_amount,
                sale.paid_amount,
                sale.installments || 1,
                sale.due_date || sale.created_at
              );

              details.forEach((inst) => {
                if (inst.status === 'pago' || inst.remaining <= 0) return;

                const key = inst.dueDate;
                if (!map[key]) {
                  map[key] = {
                    dueDate: key,
                    totalAmount: 0,
                    totalPaid: 0,
                    totalDue: 0,
                    percentage: 0,
                    itemsCount: 0,
                    salesDetails: [],
                  };
                }

                map[key].totalAmount += inst.total;
                map[key].totalPaid += inst.paid;
                map[key].totalDue += inst.remaining;
                map[key].itemsCount += 1;
                map[key].salesDetails.push({
                  saleId: sale.id,
                  total: inst.total,
                  paid: inst.paid,
                  remaining: inst.remaining,
                  instNum: inst.number,
                  totalInst: sale.installments || 1,
                  isPartial: inst.status === 'parcial',
                });
              });
            });

            const monthlyGroups = Object.values(map).map((g) => {
              const pct = g.totalAmount > 0 ? (g.totalPaid / g.totalAmount) * 100 : 0;
              return { ...g, percentage: Math.min(100, Math.max(0, pct)) };
            }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

            return (
              <Card style={styles.card}>
                <CardTitle
                  title="Parcelas Unificadas por Mês"
                  subtitle="Soma de todas as parcelas pendentes do cliente"
                  right={
                    monthlyGroups.length > 0 ? (
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: colors.primaryLight,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: radius.full,
                        }}
                        onPress={() => handleShareUnifiedSchedule(monthlyGroups)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="share-social-outline" size={14} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginLeft: 4 }}>
                          Compartilhar
                        </Text>
                      </TouchableOpacity>
                    ) : null
                  }
                />

                {monthlyGroups.length === 0 ? (
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4 }}>
                    Nenhuma parcela pendente nos próximos meses 🎉
                  </Text>
                ) : (
                  <>
                    <View style={{ gap: 12, marginTop: 4 }}>
                      {monthlyGroups.map((group) => {
                        const isGroupOverdue = isOverdue(group.dueDate) && group.totalDue > 0;
                        const isPartialInMonth = group.totalPaid > 0 && group.totalDue > 0;
                        const statusColor = group.percentage >= 100
                          ? colors.success
                          : isGroupOverdue
                          ? colors.error
                          : isPartialInMonth
                          ? colors.primary
                          : colors.textTertiary;
                        const statusLabel = group.percentage >= 100
                          ? 'Quitado ✓'
                          : isGroupOverdue
                          ? 'Vencido'
                          : isPartialInMonth
                          ? `Parcial (${group.percentage.toFixed(0)}%)`
                          : 'Pendente';

                        return (
                          <View
                            key={group.dueDate}
                            style={{
                              padding: 12,
                              borderRadius: radius.md,
                              backgroundColor: colors.surfaceSecondary,
                              borderColor: colors.border,
                              borderWidth: 1,
                            }}
                          >
                            {/* Cabeçalho do Mês */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                                <View>
                                  <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
                                    Vencimento: {formatDate(group.dueDate)}
                                  </Text>
                                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                                    {group.itemsCount} parcela(s) neste mês
                                  </Text>
                                </View>
                              </View>

                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: colors.error, fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
                                  {formatCurrency(group.totalDue)}
                                </Text>
                                <Text style={{ color: statusColor, fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: 2 }}>
                                  {statusLabel}
                                </Text>
                              </View>
                            </View>

                            {/* Barra de Progresso da Porcentagem por Mês */}
                            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
                              <View
                                style={{
                                  height: '100%',
                                  width: `${group.percentage}%`,
                                  backgroundColor: statusColor,
                                  borderRadius: 3,
                                }}
                              />
                            </View>

                            {/* Detalhamento por Venda */}
                            {group.salesDetails.length > 0 && (
                              <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
                                {group.salesDetails.map((item, idx) => (
                                  <TouchableOpacity
                                    key={idx}
                                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: idx === 0 ? 0 : 4 }}
                                    onPress={() => router.push({ pathname: `/(tabs)/sales/${item.saleId}` as any, params: { from: `/(tabs)/clients/${id}` } })}
                                  >
                                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                                      • Parcela {item.instNum}/{item.totalInst}
                                    </Text>
                                    <Text style={{ color: colors.text, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                                      {formatCurrency(item.remaining)}
                                      {item.isPartial && (
                                        <Text style={{ color: colors.primary, fontSize: fontSize.xs }}> (Parcial)</Text>
                                      )}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            )}
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
                        onPress={() => handleShareUnifiedSchedule(monthlyGroups)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="share-outline" size={16} color={colors.text} />
                        <Text style={{ color: colors.text, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                          Compartilhar Texto
                        </Text>
                      </TouchableOpacity>

                      {client.phone ? (
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
                          onPress={() => handleWhatsAppShareUnified(monthlyGroups)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
                          <Text style={{ color: '#FFF', fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>
                            Enviar no WhatsApp
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </>
                )}
              </Card>
            );
          })()}

          {/* Notes */}
          {client.notes && (
            <Card style={styles.card}>
              <CardTitle title="Observações" />
              <Text style={{ color: colors.text, fontSize: fontSize.base, lineHeight: 22 }}>
                {client.notes}
              </Text>
            </Card>
          )}

          {/* Sales History */}
          <Card style={StyleSheet.flatten([styles.card, { padding: 0 }])} noPadding>
            <View style={{ padding: 16, paddingBottom: 0 }}>
              <CardTitle
                title="Histórico de Vendas"
                subtitle={`${sales.length} venda(s)`}
                right={
                  <TouchableOpacity
                    style={[styles.quickSaleBtn, { backgroundColor: colors.primary, borderRadius: radius.full }]}
                    onPress={() => router.push({ pathname: '/(tabs)/sales/new', params: { clientId: id } })}
                  >
                    <Ionicons name="add" size={16} color="#FFF" />
                    <Text style={[styles.quickSaleText, { fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>
                      Nova Venda
                    </Text>
                  </TouchableOpacity>
                }
              />
            </View>
            {sales.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="Sem vendas"
                description="Este cliente ainda não possui vendas registradas."
                action={
                  <Button
                    label="Registrar Venda para este Cliente"
                    onPress={() => router.push({ pathname: '/(tabs)/sales/new', params: { clientId: id } })}
                    size="sm"
                    style={{ marginTop: 8 }}
                  />
                }
              />
            ) : (
              sales.map((sale, i) => {
                const paymentInfo = getSalePaymentInfo(sale);
                const activeDueDate = paymentInfo.isOverdue
                  ? paymentInfo.overdueDueDate
                  : paymentInfo.nextDueDate || sale.due_date;

                return (
                  <TouchableOpacity
                    key={sale.id}
                    style={[
                      styles.saleRow,
                      {
                        borderTopColor: colors.border,
                        borderTopWidth: i === 0 ? 0 : 1,
                      },
                    ]}
                    onPress={() => router.push({ pathname: `/(tabs)/sales/${sale.id}` as any, params: { from: `/(tabs)/clients/${id}` } })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.medium }}>
                        {formatDate(sale.created_at)}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }}>
                        {sale.sale_items?.length ?? 0} itens
                        {activeDueDate && !paymentInfo.isFullyPaid ? ` · Vence ${formatDate(activeDueDate)}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                      <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
                        {formatCurrency(sale.total_amount)}
                      </Text>
                      <Badge status={paymentInfo.displayStatus} label={paymentInfo.displayStatusLabel} style={{ marginTop: 4 }} />
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                );
              })
            )}
          </Card>


          {/* Danger Zone */}
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.error }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={{ color: colors.error, fontSize: fontSize.base, fontWeight: fontWeight.medium, marginLeft: 8 }}>
              Excluir Cliente
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  initials: {},
  name: { marginBottom: 4, letterSpacing: -0.3 },
  since: { marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    gap: 6,
  },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  content: { paddingHorizontal: 16 },
  card: { marginBottom: 12 },
  financialRow: { flexDirection: 'row', alignItems: 'center' },
  finItem: { flex: 1, alignItems: 'center' },
  finDivider: { width: 1, height: 40 },
  finValue: { marginBottom: 4 },
  finLabel: { letterSpacing: 0.3 },
  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  quickSaleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  quickSaleText: {
    color: '#FFF',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 16,
  },
});