import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency } from '@/utils/format';

export interface RevenueDataPoint {
  label: string;
  received: number;
  due: number;
}

interface RevenueLineChartProps {
  data: RevenueDataPoint[];
  pageSize?: number;
}

/**
 * Computes a Monotone Cubic Spline (curveMonotoneX) path string.
 * Mathematically PREVENTS overshoot below 0 or above peak values.
 */
function getMonotoneSplinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
  }

  const n = points.length;
  const dxs: number[] = [];
  const dys: number[] = [];
  const ms: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    dxs.push(dx);
    dys.push(dy);
    ms.push(dx === 0 ? 0 : dy / dx);
  }

  const c1s: { x: number; y: number }[] = [{ x: ms[0], y: ms[0] }];
  for (let i = 0; i < n - 2; i++) {
    const m = ms[i];
    const mNext = ms[i + 1];

    if (m * mNext <= 0) {
      c1s.push({ x: 0, y: 0 });
    } else {
      const dx_sum = dxs[i] + dxs[i + 1];
      const common = (3 * dx_sum) / ((2 * dx_sum + dxs[i + 1]) / m + (dx_sum + 2 * dxs[i]) / mNext);
      c1s.push({ x: common, y: common });
    }
  }
  c1s.push({ x: ms[ms.length - 1], y: ms[ms.length - 1] });

  const controlPoints: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = dxs[i];
    controlPoints.push({
      x1: points[i].x + dx / 3,
      y1: points[i].y + (c1s[i].x * dx) / 3,
      x2: points[i + 1].x - dx / 3,
      y2: points[i + 1].y - (c1s[i + 1].x * dx) / 3,
    });
  }

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const cp = controlPoints[i];
    const pNext = points[i + 1];
    path += ` C ${cp.x1.toFixed(2)} ${cp.y1.toFixed(2)}, ${cp.x2.toFixed(2)} ${cp.y2.toFixed(2)}, ${pNext.x.toFixed(2)} ${pNext.y.toFixed(2)}`;
  }

  return path;
}

function getMonotoneAreaPath(points: { x: number; y: number }[], zeroY: number): string {
  if (points.length < 2) return '';
  const spline = getMonotoneSplinePath(points);
  const firstX = points[0].x.toFixed(2);
  const lastX = points[points.length - 1].x.toFixed(2);
  const y0 = zeroY.toFixed(2);
  return `${spline} L ${lastX} ${y0} L ${firstX} ${y0} Z`;
}

export function RevenueLineChart({ data, pageSize = 6 }: RevenueLineChartProps) {
  const { colors, fontSize, fontWeight, radius } = useTheme();
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  // Reset pageIndex when data changes if out of bounds
  useEffect(() => {
    if (pageIndex >= totalPages) {
      setPageIndex(Math.max(0, totalPages - 1));
    }
  }, [data.length, totalPages, pageIndex]);

  if (!data || data.length === 0) return null;

  const visibleData = data.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 2) {
      setContainerWidth(w);
    }
  };

  const chartHeight = 165;
  const yAxisWidth = 36;
  const paddingTop = 12;
  const paddingBottom = 26;
  const paddingLeft = 10;
  const paddingRight = 10;

  const drawableWidth = Math.max(100, containerWidth - yAxisWidth);
  const drawableHeight = chartHeight - paddingTop - paddingBottom;

  // Max calculation for visible data
  const maxValRaw = Math.max(
    ...visibleData.map((d) => Math.max(d.received, d.due)),
    10
  );
  const maxVal = Math.ceil((maxValRaw * 1.2) / 10) * 10;

  // Y-axis grid values
  const sectionsCount = 4;
  const sectionStep = maxVal / sectionsCount;
  const yValues = Array.from({ length: sectionsCount + 1 }, (_, i) => maxVal - i * sectionStep);

  const formatYLabel = (v: number) => {
    if (v >= 1000) return `R$${(v / 1000).toFixed(0)}K`;
    return `R$${Math.round(v)}`;
  };

  // Coordinates calculation
  const numPoints = visibleData.length;
  const xStep = numPoints > 1 ? (drawableWidth - paddingLeft - paddingRight) / (numPoints - 1) : 0;
  const zeroY = paddingTop + drawableHeight;

  const receivedPoints = visibleData.map((d, i) => {
    const x = paddingLeft + i * xStep;
    const y = paddingTop + drawableHeight * (1 - Math.min(1, Math.max(0, d.received / maxVal)));
    return { x, y };
  });

  const duePoints = visibleData.map((d, i) => {
    const x = paddingLeft + i * xStep;
    const y = paddingTop + drawableHeight * (1 - Math.min(1, Math.max(0, d.due / maxVal)));
    return { x, y };
  });

  const pathReceivedLine = getMonotoneSplinePath(receivedPoints);
  const pathReceivedArea = getMonotoneAreaPath(receivedPoints, zeroY);

  const pathDueLine = getMonotoneSplinePath(duePoints);
  const pathDueArea = getMonotoneAreaPath(duePoints, zeroY);

  const handleTouch = (evt: any) => {
    if (!drawableWidth || numPoints <= 1) return;
    const locationX = evt.nativeEvent.locationX;
    const relX = locationX - paddingLeft;
    const index = Math.min(numPoints - 1, Math.max(0, Math.round(relX / xStep)));
    setSelectedIndex(selectedIndex === index ? null : index);
  };

  const activeIndex = selectedIndex !== null ? Math.min(selectedIndex, numPoints - 1) : numPoints - 1;
  const activeData = visibleData[activeIndex];
  const activeReceivedPt = receivedPoints[activeIndex];

  const firstLabel = visibleData[0]?.label ?? '';
  const lastLabel = visibleData[visibleData.length - 1]?.label ?? '';
  const periodText = firstLabel === lastLabel ? firstLabel : `${firstLabel} - ${lastLabel}`;

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      {/* Navigation Header when there are multiple pages */}
      {totalPages > 1 && (
        <View style={styles.navHeader}>
          <Text style={[styles.periodText, { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>
            {periodText}
          </Text>

          <View style={styles.navButtons}>
            <TouchableOpacity
              style={[
                styles.navBtn,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                pageIndex === 0 && { opacity: 0.3 },
              ]}
              disabled={pageIndex === 0}
              onPress={() => {
                setPageIndex((p) => Math.max(0, p - 1));
                setSelectedIndex(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={14} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navBtn,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                pageIndex >= totalPages - 1 && { opacity: 0.3 },
              ]}
              disabled={pageIndex >= totalPages - 1}
              onPress={() => {
                setPageIndex((p) => Math.min(totalPages - 1, p + 1));
                setSelectedIndex(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={14} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.chartContainer}>
        {/* Sticky Y-Axis */}
        <View style={[styles.yAxis, { width: yAxisWidth, height: chartHeight }]}>
          {yValues.map((v, idx) => {
            const topPos = paddingTop + (drawableHeight / sectionsCount) * idx - 6;
            return (
              <Text
                key={idx}
                style={[
                  styles.yLabel,
                  { color: colors.textTertiary, top: topPos },
                ]}
              >
                {formatYLabel(v)}
              </Text>
            );
          })}
        </View>

        {/* SVG Drawing Canvas */}
        {containerWidth > 0 && (
          <TouchableWithoutFeedback onPress={handleTouch}>
            <View style={{ flex: 1, height: chartHeight }}>
              <Svg width={drawableWidth} height={chartHeight}>
                <Defs>
                  {/* Received Gradient */}
                  <LinearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={colors.success} stopOpacity="0.32" />
                    <Stop offset="100%" stopColor={colors.success} stopOpacity="0.0" />
                  </LinearGradient>

                  {/* Due Gradient */}
                  <LinearGradient id="gradDue" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={colors.warning} stopOpacity="0.28" />
                    <Stop offset="100%" stopColor={colors.warning} stopOpacity="0.0" />
                  </LinearGradient>
                </Defs>

                {/* Horizontal Grid Rules */}
                {yValues.map((_, idx) => {
                  const y = paddingTop + (drawableHeight / sectionsCount) * idx;
                  return (
                    <Line
                      key={idx}
                      x1={paddingLeft}
                      y1={y}
                      x2={drawableWidth - paddingRight}
                      y2={y}
                      stroke={colors.border}
                      strokeWidth={1}
                      strokeDasharray={idx === sectionsCount ? undefined : '3 3'}
                    />
                  );
                })}

                {/* Received Area & Line */}
                {pathReceivedArea !== '' && (
                  <Path d={pathReceivedArea} fill="url(#gradReceived)" />
                )}
                {pathReceivedLine !== '' && (
                  <Path
                    d={pathReceivedLine}
                    fill="none"
                    stroke={colors.success}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                )}

                {/* Due Area & Line */}
                {pathDueArea !== '' && (
                  <Path d={pathDueArea} fill="url(#gradDue)" />
                )}
                {pathDueLine !== '' && (
                  <Path
                    d={pathDueLine}
                    fill="none"
                    stroke={colors.warning}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                )}

                {/* Pointer Vertical Strip line when active */}
                {activeReceivedPt && (
                  <Line
                    x1={activeReceivedPt.x}
                    y1={paddingTop}
                    x2={activeReceivedPt.x}
                    y2={zeroY}
                    stroke={colors.border}
                    strokeWidth={1.5}
                  />
                )}

                {/* Received Data Points (Slightly smaller: r=2.8 / r=4.0) */}
                {receivedPoints.map((pt, i) => (
                  <Circle
                    key={`rec-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={i === activeIndex ? 4.0 : 2.8}
                    fill={colors.surface}
                    stroke={colors.success}
                    strokeWidth={i === activeIndex ? 2.5 : 1.8}
                  />
                ))}

                {/* Due Data Points (Slightly smaller: r=2.8 / r=4.0) */}
                {duePoints.map((pt, i) => (
                  <Circle
                    key={`due-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={i === activeIndex ? 4.0 : 2.8}
                    fill={colors.surface}
                    stroke={colors.warning}
                    strokeWidth={i === activeIndex ? 2.5 : 1.8}
                  />
                ))}
              </Svg>

              {/* X-Axis Labels */}
              <View style={styles.xAxisRow}>
                {visibleData.map((d, i) => {
                  const ptX = paddingLeft + i * xStep;
                  return (
                    <Text
                      key={i}
                      style={[
                        styles.xLabel,
                        {
                          color: i === activeIndex ? colors.text : colors.textTertiary,
                          fontWeight: i === activeIndex ? fontWeight.bold : fontWeight.medium,
                          left: ptX - 24,
                          width: 48,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {d.label}
                    </Text>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        )}
      </View>

      {/* Clean Tooltip Box (Without Month Label title) */}
      {activeData && (
        <View style={[styles.tooltipBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <View style={styles.tooltipItem}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>Recebido: </Text>
            <Text style={{ color: colors.success, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>
              {formatCurrency(activeData.received)}
            </Text>
          </View>

          <View style={styles.tooltipItem}>
            <View style={[styles.dot, { backgroundColor: colors.warning }]} />
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>A Receber: </Text>
            <Text style={{ color: colors.warning, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>
              {formatCurrency(activeData.due)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  periodText: {},
  navButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  navBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 165,
  },
  yAxis: {
    position: 'relative',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 3,
  },
  yLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'right',
  },
  xAxisRow: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    height: 20,
  },
  xLabel: {
    position: 'absolute',
    fontSize: 10,
    textAlign: 'center',
  },
  tooltipBox: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tooltipItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
});
