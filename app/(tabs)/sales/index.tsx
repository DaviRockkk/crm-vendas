import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
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
import { isOverdue } from '@/utils/format';

type FilterType = SaleStatus | 'atrasadas' | 'todos';

const STATUS_FILTERS: { label: string; value: FilterType }[] = [
  { label: 'Todas', value: 'todos' },
  { label: 'Atrasadas', value: 'atrasadas' },
  { label: 'Pendente', value: 'pendente' },
  { label: 'Parcial', value: 'parcial' },
  { label: 'Pago', value: 'pago' },
];

export default function SalesScreen() {
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: sales = [], isLoading, refetch, isRefetching } = useSales();
  const [filter, setFilter] = useState<FilterType>('todos');

  const filtered = sales.filter((s) => {
    if (filter === 'todos') return true;
    if (filter === 'atrasadas') return s.status !== 'pago' && isOverdue(s.due_date);
    return s.status === filter;
  });

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
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
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
                    fontWeight: active ? fontWeight.semibold : fontWeight.medium,
                  }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
});