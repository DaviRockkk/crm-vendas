import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { formatDate, getTodayDate } from '@/utils/format';

interface DatePickerProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  hint?: string;
  containerStyle?: ViewStyle;
  suggestDayFive?: boolean;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function DatePicker({
  label,
  value,
  onChange,
  hint,
  containerStyle,
  suggestDayFive = false,
}: DatePickerProps) {
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const [showModal, setShowModal] = useState(false);

  // Data em foco no calendário (ano/mês)
  const initialDate = value ? new Date(value + 'T12:00:00') : new Date();
  const [currentYear, setCurrentYear] = useState(
    isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState(
    isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth()
  );

  function handleOpen() {
    const d = value ? new Date(value + 'T12:00:00') : new Date();
    if (!isNaN(d.getTime())) {
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
    }
    setShowModal(true);
  }

  function changeMonth(delta: number) {
    let newM = currentMonth + delta;
    let newY = currentYear;
    if (newM > 11) {
      newM = 0;
      newY += 1;
    } else if (newM < 0) {
      newM = 11;
      newY -= 1;
    }
    setCurrentMonth(newM);
    setCurrentYear(newY);
  }

  function selectDay(day: number) {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const formatted = `${currentYear}-${monthStr}-${dayStr}`;
    onChange(formatted);
    setShowModal(false);
  }

  function selectToday() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setShowModal(false);
  }

  function selectDayFive() {
    let y = currentYear;
    let m = currentMonth;
    const mStr = String(m + 1).padStart(2, '0');
    onChange(`${y}-${mStr}-05`);
    setShowModal(false);
  }

  // Cálculos do calendário
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  const selectedYMD = value ? value.slice(0, 10) : '';
  const todayYMD = getTodayDate();

  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }]}>
          {label}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.field,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
            borderRadius: radius.md,
          },
        ]}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
        <Text style={{ flex: 1, color: value ? colors.text : colors.textTertiary, fontSize: fontSize.base, fontWeight: fontWeight.medium }}>
          {value ? formatDate(value) : 'Selecionar data no calendário...'}
        </Text>
        <Ionicons name="chevron-down-outline" size={18} color={colors.textTertiary} />
      </TouchableOpacity>

      {hint && (
        <Text style={[styles.hint, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
          {hint}
        </Text>
      )}

      {/* Calendar Modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.calendarCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header Mês/Ano */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Dias da semana */}
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={[styles.weekdayText, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
                  {w}
                </Text>
              ))}
            </View>

            {/* Grid dos dias */}
            <View style={styles.daysGrid}>
              {/* Espaços vazios antes do 1º dia */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <View key={`empty-${idx}`} style={styles.dayCell} />
              ))}

              {/* Dias do mês */}
              {Array.from({ length: totalDays }).map((_, idx) => {
                const dayNum = idx + 1;
                const mStr = String(currentMonth + 1).padStart(2, '0');
                const dStr = String(dayNum).padStart(2, '0');
                const dayYMD = `${currentYear}-${mStr}-${dStr}`;

                const isSelected = selectedYMD === dayYMD;
                const isToday = todayYMD === dayYMD;

                return (
                  <TouchableOpacity
                    key={dayNum}
                    style={styles.dayCell}
                    onPress={() => selectDay(dayNum)}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isToday
                            ? colors.primaryLight
                            : 'transparent',
                          borderColor: isToday && !isSelected ? colors.primary : 'transparent',
                          borderWidth: isToday && !isSelected ? 1.5 : 0,
                          borderRadius: 20,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isSelected
                            ? '#FFF'
                            : isToday
                            ? colors.primary
                            : colors.text,
                          fontSize: fontSize.sm,
                          fontWeight: isSelected || isToday ? fontWeight.bold : fontWeight.regular,
                        }}
                      >
                        {dayNum}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick action buttons */}
            <View style={[styles.calendarFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.footerBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md }]}
                onPress={selectToday}
              >
                <Ionicons name="today-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginLeft: 4 }}>
                  Hoje
                </Text>
              </TouchableOpacity>

              {suggestDayFive && (
                <TouchableOpacity
                  style={[styles.footerBtn, { backgroundColor: colors.primaryLight, borderRadius: radius.md }]}
                  onPress={selectDayFive}
                >
                  <Ionicons name="calendar-number-outline" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginLeft: 4 }}>
                    Dia 5 deste mês
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.footerBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium }}>
                  Fechar
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  hint: { marginTop: 4, marginLeft: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 340,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    padding: 6,
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
