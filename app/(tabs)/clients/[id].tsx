import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useClient, useDeleteClient } from '@/hooks/useClients';
import { useSalesByClient } from '@/hooks/useSales';
import { useTheme } from '@/hooks/useTheme';
import { Header } from '@/components/ui/Header';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDate, formatPhone, getWhatsAppUrl } from '@/utils/format';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, fontSize, fontWeight, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: client, isLoading } = useClient(id);
  const { data: sales = [] } = useSalesByClient(id);
  const deleteClient = useDeleteClient();

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!client) return null;

  const totalDue = sales.filter(s => s.status !== 'pago').reduce((acc, s) => acc + s.due_amount, 0);
  const totalPaid = sales.reduce((acc, s) => acc + s.paid_amount, 0);
  const totalAmount = sales.reduce((acc, s) => acc + s.total_amount, 0);

  const whatsappUrl = getWhatsAppUrl(client.phone);

  async function handleDelete() {
    if (!client) return;
    Alert.alert(
      'Excluir Cliente',
      `Tem certeza que deseja excluir "${client.name}"? Todas as vendas associadas também serão removidas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteClient.mutateAsync(id);
            router.back();
          },
        },
      ],
    );
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
                <Text style={styles.actionBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            {client.phone && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => Linking.openURL(`tel:${client.phone}`)}
              >
                <Ionicons name="call" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>{formatPhone(client.phone)}</Text>
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
                <Text style={[styles.finValue, { color: colors.success, fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}>
                  {formatCurrency(totalPaid)}
                </Text>
                <Text style={[styles.finLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
                  Total Pago
                </Text>
              </View>
              <View style={[styles.finDivider, { backgroundColor: colors.border }]} />
              <View style={styles.finItem}>
                <Text style={[styles.finValue, { color: totalDue > 0 ? colors.error : colors.textSecondary, fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}>
                  {formatCurrency(totalDue)}
                </Text>
                <Text style={[styles.finLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
                  A Receber
                </Text>
              </View>
              <View style={[styles.finDivider, { backgroundColor: colors.border }]} />
              <View style={styles.finItem}>
                <Text style={[styles.finValue, { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}>
                  {formatCurrency(totalAmount)}
                </Text>
                <Text style={[styles.finLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
                  Total Geral
                </Text>
              </View>
            </View>
          </Card>

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
              <CardTitle title="Histórico de Vendas" subtitle={`${sales.length} venda(s)`} />
            </View>
            {sales.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="Sem vendas"
                description="Este cliente ainda não possui vendas registradas."
              />
            ) : (
              sales.map((sale, i) => (
                <TouchableOpacity
                  key={sale.id}
                  style={[
                    styles.saleRow,
                    {
                      borderTopColor: colors.border,
                      borderTopWidth: i === 0 ? 0 : 1,
                    },
                  ]}
                  onPress={() => router.push(`/(tabs)/sales/${sale.id}`)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.medium }}>
                      {formatDate(sale.created_at)}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }}>
                      {sale.sale_items?.length ?? 0} itens
                      {sale.due_date ? ` · Vence ${formatDate(sale.due_date)}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
                      {formatCurrency(sale.total_amount)}
                    </Text>
                    <Badge status={sale.status} style={{ marginTop: 4 }} />
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              ))
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