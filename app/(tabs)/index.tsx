import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart, BarChart } from 'react-native-gifted-charts';
import { useDashboard } from '@/hooks/useDashboard';
import { useTheme } from '@/hooks/useTheme';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '@/utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;

export default function DashboardScreen() {
  const { colors, fontSize, fontWeight, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: stats, isLoading, refetch, isRefetching } = useDashboard();

  if (isLoading) return <LoadingSpinner fullScreen label="Carregando dashboard..." />;

  const lineData = (stats?.monthlySales ?? []).map((d) => ({
    value: d.value,
    label: d.date.slice(5),
    dataPointColor: colors.primary,
  }));

  const pieData = (stats?.statusBreakdown ?? []).map((s) => ({
    value: s.value,
    color: s.color,
    text: s.label,
  }));

  const barData = (stats?.topProducts ?? []).map((p) => ({
    value: p.count,
    label: p.name.length > 8 ? p.name.slice(0, 8) + '…' : p.name,
    frontColor: colors.primary,
  }));

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 16 },
        ]}
      >
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
            Bem-vindo de volta 👋
          </Text>
          <Text style={[styles.title, { color: colors.text, fontSize: fontSize['3xl'], fontWeight: fontWeight.extrabold }]}>
            Dashboard
          </Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="analytics" size={22} color={colors.primary} />
        </View>
      </View>

      <View style={styles.content}>
        {/* Stat Cards */}
        <View style={styles.statsRow}>
          <StatCard
            label="Total Recebido"
            value={stats?.totalReceived ?? 0}
            icon={<Ionicons name="trending-up" size={20} color={colors.success} />}
            accentColor={colors.success}
          />
          <View style={{ width: 12 }} />
          <StatCard
            label="Total a Receber"
            value={stats?.totalDue ?? 0}
            icon={<Ionicons name="time-outline" size={20} color={colors.error} />}
            accentColor={colors.error}
          />
        </View>

        <StatCard
          label="Total de Vendas"
          value={stats?.totalSales ?? 0}
          isCurrency={false}
          icon={<Ionicons name="receipt-outline" size={20} color={colors.primary} />}
          accentColor={colors.primary}
          style={{ marginBottom: 20 }}
        />

        {/* Line Chart — Recebimentos do Mês */}
        {lineData.length > 0 && (
          <Card style={styles.chartCard}>
            <CardTitle title="Recebimentos no Mês" subtitle="Por dia" />
            <LineChart
              data={lineData}
              width={CHART_WIDTH}
              height={160}
              color={colors.chartBlue}
              thickness={2.5}
              dataPointsColor={colors.chartBlue}
              startFillColor={colors.chartBlue}
              endFillColor={colors.chartBlue + '10'}
              startOpacity={0.25}
              endOpacity={0.02}
              areaChart
              curved
              hideDataPoints={lineData.length > 10}
              xAxisColor={colors.border}
              yAxisColor={colors.border}
              yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textTertiary, fontSize: 9 }}
              rulesColor={colors.border}
              rulesType="solid"
              noOfSections={4}
              hideRules={false}
              showYAxisIndices={false}
              yAxisLabelWidth={52}
              formatYLabel={(v) => {
                const n = Number(v);
                if (n >= 1000) return `R$${(n / 1000).toFixed(0)}K`;
                return `R$${n}`;
              }}
            />
          </Card>
        )}

        {/* Pie Chart — Status */}
        {pieData.length > 0 && (
          <Card style={styles.chartCard}>
            <CardTitle title="Status das Vendas" subtitle="Distribuição por status" />
            <View style={styles.pieRow}>
              <PieChart
                data={pieData}
                donut
                radius={70}
                innerRadius={42}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }}>
                      {stats?.totalSales}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                      vendas
                    </Text>
                  </View>
                )}
              />
              <View style={styles.legend}>
                {stats?.statusBreakdown.map((s) => (
                  <View key={s.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                    <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
                      {s.label}: <Text style={{ fontWeight: fontWeight.semibold }}>{s.value}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        )}

        {/* Bar Chart — Top Produtos */}
        {barData.length > 0 && (
          <Card style={styles.chartCard}>
            <CardTitle title="Produtos Mais Vendidos" subtitle="Top 5 por quantidade" />
            <BarChart
              data={barData}
              width={CHART_WIDTH}
              height={160}
              barWidth={Math.max(24, (CHART_WIDTH / (barData.length * 2)))}
              spacing={Math.max(12, (CHART_WIDTH / (barData.length * 3)))}
              roundedTop
              roundedBottom={false}
              frontColor={colors.chartBlue}
              gradientColor={colors.chartPurple}
              showGradient
              xAxisColor={colors.border}
              yAxisColor={colors.border}
              yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textTertiary, fontSize: 9 }}
              rulesColor={colors.border}
              noOfSections={4}
              yAxisLabelWidth={28}
            />
          </Card>
        )}

        {/* Top Debtors */}
        {(stats?.topDebtors ?? []).length > 0 && (
          <Card style={styles.chartCard}>
            <CardTitle title="Maiores Devedores" subtitle="Clientes com saldo pendente" />
            {stats?.topDebtors.map((d, i) => (
              <View
                key={d.client_id}
                style={[
                  styles.debtorRow,
                  { borderTopColor: colors.border, borderTopWidth: i === 0 ? 0 : 1 },
                ]}
              >
                <View style={[styles.rankBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
                    {i + 1}
                  </Text>
                </View>
                <Text
                  style={{ flex: 1, color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.medium, marginLeft: 12 }}
                  numberOfLines={1}
                >
                  {d.name}
                </Text>
                <Text style={{ color: colors.error, fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
                  {formatCurrency(d.amount)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {!stats?.totalSales && (
          <Card style={styles.chartCard}>
            <View style={styles.emptyDash}>
              <Ionicons name="bar-chart-outline" size={40} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.base, marginTop: 12, textAlign: 'center' }}>
                Nenhuma venda ainda.{'\n'}Cadastre sua primeira venda para ver os gráficos!
              </Text>
            </View>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  greeting: { marginBottom: 2 },
  title: { letterSpacing: -1 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 16 },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chartCard: { marginBottom: 16 },
  pieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legend: { flex: 1, paddingLeft: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  debtorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDash: {
    alignItems: 'center',
    padding: 24,
  },
});