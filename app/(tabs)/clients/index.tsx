import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClients } from '@/hooks/useClients';
import { useTheme } from '@/hooks/useTheme';
import { ClientCard } from '@/components/clients/ClientCard';
import { Header } from '@/components/ui/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/utils/format';
import type { Client } from '@/types';

type SortOption = 'name' | 'debt' | 'paid';

export default function ClientsScreen() {
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: clients = [], isLoading, refetch, isRefetching } = useClients();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [onlyDebt, setOnlyDebt] = useState(false);

  // Overall Statistics
  const totalClients = clients.length;
  const totalDebt = clients.reduce((acc, c) => acc + (c.totalDue ?? 0), 0);
  const totalDebtors = clients.filter((c) => (c.totalDue ?? 0) > 0).length;

  const processedClients = useMemo(() => {
    let result = [...clients];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone ?? '').includes(q),
      );
    }

    // Filter by debt
    if (onlyDebt) {
      result = result.filter((c) => (c.totalDue ?? 0) > 0);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'debt') {
        const diff = (b.totalDue ?? 0) - (a.totalDue ?? 0);
        if (diff !== 0) return diff;
      } else if (sortBy === 'paid') {
        const diff = (b.totalPaid ?? 0) - (a.totalPaid ?? 0);
        if (diff !== 0) return diff;
      }
      // Fallback default: Ordem Alfabética (A-Z)
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    });

    return result;
  }, [clients, search, sortBy, onlyDebt]);

  const renderItem = useCallback(({ item }: { item: Client }) => (
    <ClientCard client={item} />
  ), []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header
        title="Clientes"
        subtitle={`${clients.length} cadastrados`}
        right={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/clients/new')}
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        }
      />

      {/* Summary Cards Header */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>Total</Text>
          <Text style={[styles.metricValue, { color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }]}>
            {totalClients}
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>Em Débito</Text>
          <Text style={[styles.metricValue, { color: totalDebtors > 0 ? colors.errorText : colors.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }]}>
            {totalDebtors}
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>Dívida Total</Text>
          <Text
            style={[
              styles.metricValue,
              { color: totalDebt > 0 ? colors.errorText : colors.successText, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
            ]}
            numberOfLines={1}
          >
            {formatCurrency(totalDebt)}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} style={{ marginLeft: 12 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar por nome ou telefone..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 12 }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter & Sort Chips */}
      <View style={styles.chipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {/* Sort: A-Z */}
          <TouchableOpacity
            style={[
              styles.chip,
              { borderRadius: radius.full, borderColor: sortBy === 'name' ? colors.primary : colors.border },
              sortBy === 'name' ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface },
            ]}
            onPress={() => setSortBy('name')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="text-outline"
              size={13}
              color={sortBy === 'name' ? '#FFF' : colors.textSecondary}
            />
            <Text style={[styles.chipText, { color: sortBy === 'name' ? '#FFF' : colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium }]}>
              A-Z
            </Text>
          </TouchableOpacity>

          {/* Sort: Maior Dívida */}
          <TouchableOpacity
            style={[
              styles.chip,
              { borderRadius: radius.full, borderColor: sortBy === 'debt' ? colors.primary : colors.border },
              sortBy === 'debt' ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface },
            ]}
            onPress={() => setSortBy('debt')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="trending-down-outline"
              size={13}
              color={sortBy === 'debt' ? '#FFF' : colors.textSecondary}
            />
            <Text style={[styles.chipText, { color: sortBy === 'debt' ? '#FFF' : colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium }]}>
              Maior Dívida
            </Text>
          </TouchableOpacity>

          {/* Sort: Maior Valor Pago */}
          <TouchableOpacity
            style={[
              styles.chip,
              { borderRadius: radius.full, borderColor: sortBy === 'paid' ? colors.primary : colors.border },
              sortBy === 'paid' ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface },
            ]}
            onPress={() => setSortBy('paid')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="cash-outline"
              size={13}
              color={sortBy === 'paid' ? '#FFF' : colors.textSecondary}
            />
            <Text style={[styles.chipText, { color: sortBy === 'paid' ? '#FFF' : colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium }]}>
              Maior Pago
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={[styles.chipDivider, { backgroundColor: colors.border }]} />

          {/* Filter: Com Dívida */}
          <TouchableOpacity
            style={[
              styles.chip,
              { borderRadius: radius.full, borderColor: onlyDebt ? colors.error : colors.border },
              onlyDebt ? { backgroundColor: colors.errorLight } : { backgroundColor: colors.surface },
            ]}
            onPress={() => setOnlyDebt(!onlyDebt)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="alert-circle-outline"
              size={13}
              color={onlyDebt ? colors.errorText : colors.textSecondary}
            />
            <Text
              style={[
                styles.chipText,
                { color: onlyDebt ? colors.errorText : colors.textSecondary, fontSize: fontSize.xs, fontWeight: onlyDebt ? fontWeight.bold : fontWeight.medium },
              ]}
            >
              Com Dívida ({totalDebtors})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {isLoading ? (
        <LoadingSpinner label="Carregando clientes..." />
      ) : (
        <FlashList
          data={processedClients}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 24 }}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={search || onlyDebt ? 'Nenhum resultado' : 'Nenhum cliente'}
              description={
                search
                  ? `Nenhum cliente encontrado para "${search}"`
                  : onlyDebt
                  ? 'Nenhum cliente possui saldo pendente ou dívida no momento.'
                  : 'Adicione seu primeiro cliente tocando no botão + acima.'
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
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    marginBottom: 2,
  },
  metricValue: {},
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    height: 42,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  chipsWrapper: {
    paddingVertical: 10,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 5,
  },
  chipText: {},
  chipDivider: {
    width: 1,
    height: 18,
    marginHorizontal: 2,
  },
});