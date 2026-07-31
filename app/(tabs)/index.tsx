import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useDashboard } from '@/hooks/useDashboard';
import { useTheme } from '@/hooks/useTheme';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RevenueLineChart, type RevenueDataPoint } from '@/components/ui/RevenueLineChart';
import { formatCurrency } from '@/utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_INNER_WIDTH = SCREEN_WIDTH - 64;
const BAR_CHART_WIDTH = Math.max(160, CARD_INNER_WIDTH - 36);

export default function DashboardScreen() {
  const { colors, isDark, fontSize, fontWeight, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: stats, isLoading, refetch, isRefetching } = useDashboard();
  const [semesterOffset, setSemesterOffset] = useState(0);

  if (isLoading) return <LoadingSpinner fullScreen label="Carregando dashboard..." />;

  const getSemesterInfo = (offset: number) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentSemIndex = now.getMonth() < 6 ? 0 : 1;

    const totalSemesters = currentYear * 2 + currentSemIndex + offset;
    const targetYear = Math.floor(totalSemesters / 2);
    const targetSemIndex = ((totalSemesters % 2) + 2) % 2;

    const semesterTitle = `${targetSemIndex === 0 ? '1º' : '2º'} Semestre - ${targetYear}`;
    const startMonth = targetSemIndex === 0 ? 0 : 6;

    const months: string[] = [];
    for (let i = 0; i < 6; i++) {
      const mStr = String(startMonth + i + 1).padStart(2, '0');
      months.push(`${targetYear}-${mStr}`);
    }

    return { semesterTitle, months };
  };

  const { semesterTitle, months } = getSemesterInfo(semesterOffset);

  const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const now = new Date();
  const currentMKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const revenueChartData: RevenueDataPoint[] = months.map((mKey) => {
    const parts = mKey.split('-');
    const mIdx = parseInt(parts[1], 10) - 1;
    const label = MONTH_ABBR[mIdx] ?? mKey;
    return {
      label,
      received: stats?.receivedByMonth?.[mKey] ?? 0,
      due: stats?.dueByMonth?.[mKey] ?? 0,
      isCurrentMonth: mKey === currentMKey,
    };
  });

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
        <View style={{ flex: 1 }}>
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
        <View style={[styles.statsRow, { marginBottom: 20 }]}>
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
            icon={<Ionicons name="alert-circle" size={20} color={colors.warning} />}
            accentColor={colors.warning}
          />
        </View>

        {/* Pie Chart — Status das Vendas */}
        {pieData.length > 0 && (
          <Card style={styles.chartCard}>
            <CardTitle title="Status das Vendas" subtitle="Distribuição por status" />
            <View style={styles.pieRow}>
              <PieChart
                data={pieData}
                donut
                radius={70}
                innerRadius={42}
                innerCircleColor={colors.surface}
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

        {/* Dual Line Chart — Fluxo de Recebimentos (Recebidos vs A Receber) */}
        <Card style={styles.chartCard}>
          <CardTitle
            title="Fluxo de Recebimentos"
            subtitle={semesterTitle}
            right={
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => setSemesterOffset((prev) => prev - 1)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={16} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => setSemesterOffset((prev) => prev + 1)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>
            }
          />

          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 14, marginTop: -4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success }} />
              <Text style={{ color: colors.text, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                Recebidos
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.warning }} />
              <Text style={{ color: colors.text, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                A Receber (Previsão)
              </Text>
            </View>
          </View>

          <RevenueLineChart data={revenueChartData} key={semesterTitle} />
        </Card>

        {/* Bar Chart — Top Produtos */}
        {barData.length > 0 && (
          <Card style={styles.chartCard}>
            <CardTitle title="Produtos Mais Vendidos" subtitle="Top 5 por quantidade" />
            <View style={{ overflow: 'hidden', width: '100%' }}>
              <BarChart
                data={barData}
                width={BAR_CHART_WIDTH}
                height={160}
                barWidth={Math.min(28, Math.max(16, Math.floor(BAR_CHART_WIDTH / Math.max(1, barData.length * 2))))}
                spacing={Math.max(10, Math.floor((BAR_CHART_WIDTH - barData.length * 24) / Math.max(1, barData.length + 1)))}
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
                rulesLength={BAR_CHART_WIDTH}
                noOfSections={4}
                yAxisLabelWidth={28}
                initialSpacing={12}
              />
            </View>
          </Card>
        )}

        {/* Top Debtors */}
        {(stats?.topDebtors ?? []).length > 0 && (
          <Card style={styles.chartCard}>
            <CardTitle title="Maiores Devedores" subtitle="Clientes com saldo pendente" />
            {stats?.topDebtors.map((d, i) => (
              <TouchableOpacity
                key={d.client_id}
                style={[
                  styles.debtorRow,
                  { borderTopColor: colors.border, borderTopWidth: i === 0 ? 0 : 1 },
                ]}
                onPress={() => router.push({ pathname: `/(tabs)/clients/${d.client_id}` as any, params: { from: '/(tabs)' } })}
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
              </TouchableOpacity>
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
    alignItems: 'center',
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