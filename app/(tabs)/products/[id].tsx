import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useTheme } from '@/hooks/useTheme';
import { Header } from '@/components/ui/Header';
import { Card, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '@/utils/format';
import { confirmAction } from '@/utils/alert';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: product, isLoading } = useProduct(id);
  const deleteProduct = useDeleteProduct();

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!product) return null;

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
        onBack={() => router.replace('/(tabs)/products')}
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
  },
});