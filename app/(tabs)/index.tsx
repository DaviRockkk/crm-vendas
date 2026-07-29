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
import { LineChart, PieChart, BarChart } from 'react-native-gifted-charts';
import { useDashboard } from '@/hooks/useDashboard';
import { useTheme } from '@/hooks/useTheme';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '@/utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_INNER_WIDTH = SCREEN_WIDTH - 64;
const LINE_CHART_WIDTH = Math.max(160, CARD_INNER_WIDTH - 56);
const BAR_CHART_WIDTH = Math.max(160, CARD_INNER_WIDTH - 36);

export default function DashboardScreen() {
  const { colors, fontSize, fontWeight, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: stats, isLoading, refetch, isRefetching } = useDashboard();

  if (isLoading) return <LoadingSpinner fullScreen label="Carregando dashboard..." />;

  const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const rawLineReceived = (stats?.timelineData ?? []).map((d) => {
    const parts = d.month.split('-');
    const mIdx = parts.length > 1 ? parseInt(parts[1], 10) - 1 : 0;
    const yShort = parts.length > 0 ? parts[0].slice(2) : '';
    const label = mIdx >= 0 && mIdx < 12 ? `${MONTH_ABBR[mIdx]}/${yShort}` : d.month;
    return {
      value: d.received,
      label,
      dataPointColor: colors.success,
    };
  });

  const rawLineDue = (stats?.timelineData ?? []).map((d) => ({
    value: d.due,
    dataPointColor: colors.warning,
  }));

  // Ponto zerado na origem (0,0) colado na parede do eixo Y
  const lineReceived = rawLineReceived.length > 0
    ? [{ value: 0, label: '', dataPointColor: 'transparent', hideDataPoint: true }, ...rawLineReceived]
    : [];

  const lineDue = rawLineDue.length > 0
    ? [{ value: 0, label: '', dataPointColor: 'transparent', hideDataPoint: true }, ...rawLineDue]
    : [];

  const allValues = [
    ...lineReceived.map((d) => d.value),
    ...lineDue.map((d) => d.value),
  ];
  const rawMax = Math.max(...allValues, 10);
  const chartMax = Math.ceil((rawMax * 1.25) / 10) * 10;

  const ITEM_SPACING = 60;
  const TOTAL_CHART_WIDTH = Math.max(LINE_CHART_WIDTH - 44, lineReceived.length * ITEM_SPACING);

  const sectionStep = chartMax / 4;
  const yAxisLabels = [
    chartMax,
    chartMax - sectionStep,
    chartMax - sectionStep * 2,
    chartMax - sectionStep * 3,
    0,
  ].map((v) => {
    if (v >= 1000) return `R$${(v / 1000).toFixed(0)}K`;
    return `R$${Math.round(v)}`;
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

        {/* Dual Line Chart — Fluxo de Recebimentos (Recebidos vs A Receber) */}
        {lineReceived.length > 0 && (
          <Card style={styles.chartCard}>
            <CardTitle
              title="Fluxo de Recebimentos"
              subtitle="Comparativo: Recebidos vs. A Receber por Mês"
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

            <View style={{ flexDirection: 'row', width: '100%' }}>
              {/* Sticky Y-Axis Column (Fixa na esquerda) */}
              <View style={{ width: 44, height: 170, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 6, zIndex: 10 }}>
                {yAxisLabels.map((lbl, idx) => (
                  <Text key={idx} style={{ color: colors.textTertiary, fontSize: 10, fontWeight: fontWeight.medium }}>
                    {lbl}
                  </Text>
                ))}
              </View>

              {/* Scrollable Chart */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ paddingRight: 16 }}
                style={{ flex: 1 }}
              >
                <View>
                  <LineChart
                    data={lineReceived}
                    data2={lineDue}
                    width={TOTAL_CHART_WIDTH}
                    spacing={ITEM_SPACING}
                    height={170}
                    maxValue={chartMax}
                    initialSpacing={0}
                    endSpacing={12}
                    color1={colors.success}
                    color2={colors.warning}
                    dataPointsColor1={colors.success}
                    dataPointsColor2={colors.warning}
                    thickness1={2.5}
                    thickness2={2.5}
                    startFillColor1={colors.success}
                    startFillColor2={colors.warning}
                    startOpacity={0.2}
                    endOpacity={0.02}
                    areaChart
                    hideYAxisText={true}
                    yAxisLabelWidth={0}
                    pointerConfig={{
                      pointerStripColor: colors.border,
                      pointerStripWidth: 1.5,
                      pointerColor: colors.primary,
                      radius: 5,
                      pointerLabelWidth: 140,
                      pointerLabelHeight: 60,
                      autoAdjustPointerLabelPosition: true,
                      pointerLabelComponent: (items: any[]) => {
                        const item1 = items[0];
                        const item2 = items[1];
                        const monthLabel = item1?.label || item2?.label || '';
                        if (!monthLabel) return null;

                        return (
                          <View
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              backgroundColor: colors.surface,
                              borderRadius: radius.md,
                              borderColor: colors.border,
                              borderWidth: 1,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.15,
                              shadowRadius: 4,
                              elevation: 4,
                            }}
                          >
                            <Text style={{ color: colors.text, fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginBottom: 2 }}>
                              {monthLabel}
                            </Text>
                            {item1 && item1.value !== undefined && (
                              <Text style={{ color: colors.success, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                                Recebido: {formatCurrency(item1.value)}
                              </Text>
                            )}
                            {item2 && item2.value !== undefined && (
                              <Text style={{ color: colors.warning, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                                A Receber: {formatCurrency(item2.value)}
                              </Text>
                            )}
                          </View>
                        );
                      },
                    }}
                    xAxisColor={colors.border}
                    yAxisColor={colors.border}
                    xAxisLabelTextStyle={{ color: colors.textTertiary, fontSize: 9 }}
                    rulesColor={colors.border}
                    rulesType="solid"
                    rulesLength={TOTAL_CHART_WIDTH}
                    noOfSections={4}
                    hideRules={false}
                    showYAxisIndices={false}
                  />
                </View>
              </ScrollView>
            </View>
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