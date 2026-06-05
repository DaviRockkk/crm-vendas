import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Svg, { Path, Circle, Text as SvgText, Defs, LinearGradient, Stop, Line } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { crmClients, crmSales, crmPayments } from '@/services/crmService';
import { ClientWithBalance, SaleWithClient, Payment } from '@/services/database.types';

export default function DashboardScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState<ClientWithBalance[]>([]);
  const [sales, setSales] = useState<SaleWithClient[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const loadData = async () => {
    try {
      const allClients = await crmClients.getAll();
      const allSales = await crmSales.getAll();
      const allPayments = await crmPayments.getAll();
      setClients(allClients);
      setSales(allSales);
      setPayments(allPayments);
    } catch (error) {
      console.error('Erro carregando dados do painel:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // 1. Cálculos de Métricas para o Card do Topo
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Total de clientes
  const totalClientsCount = clients.length;

  // Vendas do mês atual (Faturamento)
  const salesOfMonth = sales.filter((s) => {
    const d = new Date(s.sale_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalSalesOfMonth = salesOfMonth.reduce((acc, s) => acc + s.amount, 0);

  // A Receber & Vencidos
  let totalAReceber = 0;
  let totalVencidos = 0;

  sales.forEach((sale) => {
    if (sale.status === 'pending') {
      const salePayments = payments.filter((p) => p.sale_id === sale.id);
      const paidOnSale = salePayments.reduce((acc, p) => acc + p.amount, 0);
      const debt = Math.max(0, sale.amount - paidOnSale);
      totalAReceber += debt;

      const saleDate = new Date(sale.sale_date);
      if (saleDate < sevenDaysAgo) {
        totalVencidos += debt;
      }
    }
  });

  // 2. Gráfico de Linha Mensal (Últimos 5 meses)
  // Monta os últimos 5 meses na ordem cronológica
  const getLast5MonthsLabels = () => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const result = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setMonth(today.getMonth() - i);
      result.push({
        month: d.getMonth(),
        year: d.getFullYear(),
        label: monthNames[d.getMonth()],
      });
    }
    return result;
  };

  const monthsData = getLast5MonthsLabels().map((m) => {
    const monthSales = sales.filter((s) => {
      const d = new Date(s.sale_date);
      return d.getMonth() === m.month && d.getFullYear() === m.year;
    });
    const total = monthSales.reduce((acc, s) => acc + s.amount, 0);
    return {
      label: m.label,
      value: total,
    };
  });

  const maxMonthValue = Math.max(...monthsData.map((m) => m.value), 100);

  // 3. Gráfico de Barras dos Produtos Mais Vendidos
  const productSalesMap: { [key: string]: { name: string; count: number; totalValue: number } } = {};
  sales.forEach((sale) => {
    const desc = sale.description.trim();
    if (!productSalesMap[desc]) {
      productSalesMap[desc] = { name: desc, count: 0, totalValue: 0 };
    }
    productSalesMap[desc].count += 1;
    productSalesMap[desc].totalValue += sale.amount;
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxProductCount = Math.max(...topProducts.map((p) => p.count), 1);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // SVG dimensions for Line Chart
  const svgWidth = Math.min(windowWidth - Spacing.four * 2, MaxContentWidth - Spacing.four * 2);
  const svgHeight = 160;
  const paddingX = 40;
  const paddingY = 25;

  const points = monthsData.map((d, index) => {
    const x = paddingX + (index * (svgWidth - paddingX * 2)) / (monthsData.length - 1);
    // Inverter Y pois o SVG começa do topo
    const y = svgHeight - paddingY - (d.value * (svgHeight - paddingY * 2)) / maxMonthValue;
    return { x, y, ...d };
  });

  // Gerar o path para o gráfico de linha
  let linePath = '';
  let areaPath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
    // Para fechar a área do gráfico e aplicar o gradiente
    areaPath =
      `${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`;
  }

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#208AEF" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#208AEF" />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.headerTitle}>
              Meu Painel
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Resultados e análise do seu negócio
            </ThemedText>
          </View>

          {/* 1. Card Grid no Topo */}
          <ThemedView type="backgroundElement" style={styles.metricGridCard}>
            <View style={styles.metricGridRow}>
              <View style={styles.metricItem}>
                <ThemedText type="small" themeColor="textSecondary">
                  Clientes
                </ThemedText>
                <ThemedText type="default" style={styles.metricValue}>
                  {totalClientsCount}
                </ThemedText>
              </View>
              <View style={[styles.metricItem, styles.leftBorder]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Vendas do Mês
                </ThemedText>
                <ThemedText type="default" themeColor="tint" style={styles.metricValue}>
                  {formatCurrency(totalSalesOfMonth)}
                </ThemedText>
              </View>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricGridRow}>
              <View style={styles.metricItem}>
                <ThemedText type="small" themeColor="textSecondary">
                  A Receber
                </ThemedText>
                <ThemedText type="default" themeColor="warning" style={styles.metricValue}>
                  {formatCurrency(totalAReceber)}
                </ThemedText>
              </View>
              <View style={[styles.metricItem, styles.leftBorder]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Vencidos ⚠️
                </ThemedText>
                <ThemedText type="default" themeColor="error" style={styles.metricValue}>
                  {formatCurrency(totalVencidos)}
                </ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* 2. Gráfico de Linha Mensal */}
          <View style={styles.section}>
            <ThemedText type="default" style={styles.sectionTitle}>
              📈 Faturamento Mensal
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.chartCard}>
              <Svg width={svgWidth} height={svgHeight}>
                <Defs>
                  <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#208AEF" stopOpacity="0.3" />
                    <Stop offset="1" stopColor="#208AEF" stopOpacity="0.0" />
                  </LinearGradient>
                </Defs>

                {/* Grid Lines horizontais */}
                {[0, 0.5, 1].map((r, i) => {
                  const y = paddingY + r * (svgHeight - paddingY * 2);
                  const gridVal = maxMonthValue * (1 - r);
                  return (
                    <React.Fragment key={i}>
                      <Line
                        x1={paddingX}
                        y1={y}
                        x2={svgWidth - paddingX}
                        y2={y}
                        stroke="rgba(150,150,150,0.15)"
                        strokeWidth="1"
                      />
                      <SvgText
                        x={paddingX - 8}
                        y={y + 4}
                        fill="#888"
                        fontSize="9"
                        textAnchor="end"
                      >
                        {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(1)}k` : gridVal.toFixed(0)}
                      </SvgText>
                    </React.Fragment>
                  );
                })}

                {/* Linha e Área do Gráfico */}
                {points.length > 0 && (
                  <>
                    <Path d={areaPath} fill="url(#grad)" />
                    <Path d={linePath} fill="none" stroke="#208AEF" strokeWidth="3" />
                  </>
                )}

                {/* Pontos e Rótulos */}
                {points.map((p, index) => (
                  <React.Fragment key={index}>
                    <Circle cx={p.x} cy={p.y} r="5" fill="#208AEF" stroke="#fff" strokeWidth="2" />
                    
                    {/* Rótulo dos meses abaixo */}
                    <SvgText
                      x={p.x}
                      y={svgHeight - 6}
                      fill="#888"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {p.label}
                    </SvgText>

                    {/* Rótulo de valores acima dos pontos */}
                    <SvgText
                      x={p.x}
                      y={p.y - 10}
                      fill="#888"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {p.value > 0 ? `${(p.value).toFixed(0)}` : ''}
                    </SvgText>
                  </React.Fragment>
                ))}
              </Svg>
            </ThemedView>
          </View>

          {/* 3. Gráfico de Barras dos Produtos Mais Vendidos */}
          <View style={styles.section}>
            <ThemedText type="default" style={styles.sectionTitle}>
              🛍️ Produtos Mais Vendidos (Qtd)
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.chartCard}>
              {topProducts.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Sem produtos vendidos no momento.
                </ThemedText>
              ) : (
                <View style={styles.barChartContainer}>
                  {topProducts.map((product) => {
                    const widthPercent = `${(product.count / maxProductCount) * 100}%` as any;
                    return (
                      <View key={product.name} style={styles.barRow}>
                        <View style={styles.barLabelContainer}>
                          <ThemedText type="smallBold" numberOfLines={1} style={styles.productName}>
                            {product.name}
                          </ThemedText>
                          <ThemedText type="code" themeColor="textSecondary">
                            {product.count}x ({formatCurrency(product.totalValue)})
                          </ThemedText>
                        </View>
                        {/* Progress/Bar Track */}
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: widthPercent }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ThemedView>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  header: {
    marginBottom: Spacing.two,
  },
  headerTitle: {
    fontWeight: '700',
  },
  metricGridCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  leftBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(150, 150, 150, 0.15)',
  },
  metricDivider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginVertical: Spacing.one,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: Spacing.half,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  chartCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barChartContainer: {
    width: '100%',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  barRow: {
    gap: Spacing.one,
  },
  barLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    flex: 1,
    marginRight: Spacing.three,
  },
  barTrack: {
    height: 12,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 2,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#208AEF',
    borderRadius: 6,
  },
  emptyText: {
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
});