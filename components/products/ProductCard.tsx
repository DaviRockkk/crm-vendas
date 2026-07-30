import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import type { Product } from '@/types';
import { formatCurrency } from '@/utils/format';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

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
      onPress={() => router.push(`/(tabs)/products/${product.id}`)}
      activeOpacity={0.7}
    >
      {/* Product photo or placeholder */}
      {product.photo_url ? (
        <Image source={{ uri: product.photo_url }} style={[styles.photo, { borderRadius: radius.md }]} />
      ) : (
        <View style={[styles.photoPlaceholder, { backgroundColor: colors.primaryLight, borderRadius: radius.md }]}>
          <Ionicons name="cube-outline" size={24} color={colors.primary} />
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <Text
          style={[styles.name, { color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.semibold }]}
          numberOfLines={1}
        >
          {product.name}
        </Text>
        <Text style={[styles.price, { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold }]}>
          {formatCurrency(product.default_price)}
        </Text>
      </View>

      {/* Sales count badge */}
      <View
        style={[
          styles.salesBadge,
          {
            backgroundColor: (product.salesCount ?? 0) > 0 ? colors.primaryLight : colors.surfaceSecondary,
            borderRadius: radius.full,
          },
        ]}
      >
        <Ionicons
          name="bag-handle-outline"
          size={12}
          color={(product.salesCount ?? 0) > 0 ? colors.primary : colors.textTertiary}
        />
        <Text
          style={{
            color: (product.salesCount ?? 0) > 0 ? colors.primary : colors.textTertiary,
            fontSize: fontSize.xs,
            fontWeight: fontWeight.semibold,
            marginLeft: 4,
          }}
        >
          {product.salesCount ?? 0} {product.salesCount === 1 ? 'vendido' : 'vendidos'}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  photo: {
    width: 52,
    height: 52,
    marginRight: 12,
  },
  photoPlaceholder: {
    width: 52,
    height: 52,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    paddingRight: 8,
  },
  name: {
    marginBottom: 4,
  },
  price: {},
  salesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});