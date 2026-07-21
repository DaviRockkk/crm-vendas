import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSales } from '@/hooks/useSales';
import { useTheme } from '@/hooks/useTheme';
import { SaleCard } from '@/components/sales/SaleCard';
import { Header } from '@/components/ui/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import type { Sale, SaleStatus } from '@/types';

const STATUS_FILTERS: { label: string; value: SaleStatus | 'todos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Pendente', value: 'pendente' },
  { label: 'Parcial', value: 'parcial' },
  { label: 'Pago', value: 'pago' },
];

export default function SalesScreen() {
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: sales = [], isLoading, refetch, isRefetching } = useSales();
  const [filter, setFilter] = useState<SaleStatus | 'todos'>('todos');

  const filtered = filter === 'todos' ? sales : sales.filter((s) => s.status === filter);

  const renderItem = useCallback(({ item }: { item: Sale }) => (
    <SaleCard sale={item} />
  ), []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header
        title="Vendas"
        subtitle={`${sales.length} no total`}
        right={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/sales/new')}
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        }
      />

      {/* Status filter chips */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        {STATUS_FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.surfaceSecondary,
                  borderRadius: radius.full,
                },
              ]}
              onPress={() => setFilter(f.value)}
            >
              <Text
                style={{
                  color: active ? '#FFF' : colors.textSecondary,
                  fontSize: fontSize.sm,
                  fontWeight: active ? fontWeight.semibold : fontWeight.regular,
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <LoadingSpinner label="Carregando vendas..." />
      ) : (
        <FlashList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24 }}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={filter !== 'todos' ? 'Sem vendas neste filtro' : 'Nenhuma venda'}
              description="Registre sua primeira venda tocando no botão + acima."
              action={
                filter === 'todos' ? (
                  <Button label="Nova Venda" onPress={() => router.push('/(tabs)/sales/new')} fullWidth />
                ) : undefined
              }
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
});