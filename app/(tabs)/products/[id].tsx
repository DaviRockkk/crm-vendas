import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProduct, useDeleteProduct, useProductBuyers } from '@/hooks/useProducts';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useTheme } from '@/hooks/useTheme';
import { Header } from '@/components/ui/Header';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '@/utils/format';
import { confirmAction } from '@/utils/alert';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: product, isLoading: isLoadingProduct, refetch: refetchProduct } = useProduct(id);
  const { data: buyers = [], isLoading: isLoadingBuyers, refetch: refetchBuyers } = useProductBuyers(id, product?.name);
  useRefreshOnFocus(refetchProduct);
  useRefreshOnFocus(refetchBuyers);
  const deleteProduct = useDeleteProduct();

  if (isLoadingProduct) return <LoadingSpinner fullScreen />;
  if (!product) return null;

  const totalUnitsSold = buyers.reduce((sum, b) => sum + b.quantity, 0);
  const totalRevenue = buyers.reduce((sum, b) => sum + b.total_price, 0);

  async function handleDelete() {
    confirmAction({
      title: 'Excluir Produto',
      message: `Excluir "${product!.name}"?`,
      confirmText: 'Excluir',
      onConfirm: async () => {
        await deleteProduct.mutateAsync(id);
        router.back();
      },
    });
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header
        title="Detalhe do Produto"
        showBack
        right={
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.primaryLight }]}
            onPress={() => router.push({ pathname: '/(tabs)/products/new', params: { id } })}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Photo */}
        {product.photo_url && (
          <Image
            source={{ uri: product.photo_url }}
            style={[styles.photo, { backgroundColor: colors.surfaceSecondary }]}
            resizeMode="cover"
          />
        )}
        {!product.photo_url && (
          <View style={[styles.photoPlaceholder, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="cube-outline" size={56} color={colors.primary} />
          </View>
        )}

        <View style={styles.content}>
          {/* Main Product Info */}
          <Card style={styles.card}>
            <Text style={[styles.name, { color: colors.text, fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold }]}>
              {product.name}
            </Text>
            <Text style={{ color: colors.primary, fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, marginTop: 4 }}>
              {formatCurrency(product.default_price)}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: fontSize.sm, marginTop: 8 }}>
              Cadastrado em {formatDate(product.created_at)}
            </Text>
          </Card>

          {/* Sales & Revenue Stats Card */}
          {buyers.length > 0 && (
            <Card style={styles.card}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>Total Vendido</Text>
                  <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: 2 }}>
                    {totalUnitsSold} un.
                  </Text>
                </View>

                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

                <View style={styles.statItem}>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>Receita Total</Text>
                  <Text style={{ color: colors.success, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: 2 }}>
                    {formatCurrency(totalRevenue)}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Buyers Card: Quem comprou */}
          <Card style={styles.card}>
            <CardTitle
              title="Quem Comprou"
              subtitle={
                isLoadingBuyers
                  ? 'Buscando...'
                  : `${buyers.length} ${buyers.length === 1 ? 'compra realizada' : 'compras realizadas'}`
              }
            />

            {isLoadingBuyers ? (
              <LoadingSpinner label="Carregando compradores..." />
            ) : buyers.length === 0 ? (
              <View style={styles.emptyBuyers}>
                <Ionicons name="cart-outline" size={32} color={colors.textTertiary} />
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 8, textAlign: 'center' }}>
                  Nenhum cliente comprou este produto ainda.
                </Text>
              </View>
            ) : (
              buyers.map((buyer, idx) => (
                <TouchableOpacity
                  key={buyer.id}
                  style={[
                    styles.buyerRow,
                    {
                      borderTopColor: colors.border,
                      borderTopWidth: idx === 0 ? 0 : 1,
                    },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: `/(tabs)/sales/${buyer.sale_id}` as any,
                      params: { from: `/(tabs)/products/${id}` },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                    <Text style={{ color: colors.primary, fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
                      {buyer.client_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                    <Text
                      style={{ color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.semibold }}
                      numberOfLines={1}
                    >
                      {buyer.client_name}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
                      {formatDate(buyer.sale_date)} · {buyer.quantity}x {formatCurrency(buyer.unit_price)}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
                      {formatCurrency(buyer.total_price)}
                    </Text>
                    <Badge status={buyer.sale_status} style={{ marginTop: 4 }} />
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              ))
            )}
          </Card>

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.error }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={{ color: colors.error, fontSize: fontSize.base, fontWeight: fontWeight.medium, marginLeft: 8 }}>
              Excluir Produto
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
  photo: { width: '100%', height: 240 },
  photoPlaceholder: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 16 },
  card: { marginBottom: 12 },
  name: { letterSpacing: -0.5 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  emptyBuyers: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
});