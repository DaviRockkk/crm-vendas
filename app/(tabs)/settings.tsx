import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import { exportAllDataAsJSON, exportAllDataAsCSV } from '@/utils/export';
import { Card } from '@/components/ui/Card';

interface SettingRowProps {
  icon: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}

function SettingRow({ icon, iconColor, label, sublabel, right, onPress, danger }: SettingRowProps) {
  const { colors, radius, fontSize, fontWeight } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress && !right}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={[styles.iconBg, { backgroundColor: iconColor + '20', borderRadius: radius.sm }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.label, { color: danger ? colors.error : colors.text, fontSize: fontSize.base, fontWeight: fontWeight.medium }]}>
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.sublabel, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
            {sublabel}
          </Text>
        )}
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme, fontSize, fontWeight, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [user, setUser] = React.useState<string>('');
  const [exportingJSON, setExportingJSON] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user?.email ?? '');
    });
  }, []);

  async function handleExportJSON() {
    setExportingJSON(true);
    try {
      await exportAllDataAsJSON();
    } catch (e: any) {
      Alert.alert('Erro ao exportar', e.message ?? 'Tente novamente.');
    } finally {
      setExportingJSON(false);
    }
  }

  async function handleExportCSV() {
    setExportingCSV(true);
    try {
      await exportAllDataAsCSV();
    } catch (e: any) {
      Alert.alert('Erro ao exportar', e.message ?? 'Tente novamente.');
    } finally {
      setExportingCSV(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 16 },
        ]}
      >
        <Text style={[styles.title, { color: colors.text, fontSize: fontSize['3xl'], fontWeight: fontWeight.extrabold }]}>
          Configurações
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: colors.primary }]}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={28} color={colors.primary} />
          </View>
          <View>
            <Text style={{ color: '#FFF', fontSize: fontSize.sm, opacity: 0.8 }}>
              Logado como
            </Text>
            <Text style={{ color: '#FFF', fontSize: fontSize.base, fontWeight: fontWeight.semibold }}>
              {user}
            </Text>
          </View>
        </View>

        <View style={styles.sections}>
          {/* Appearance */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
            APARÊNCIA
          </Text>
          <Card style={styles.card} noPadding>
            <SettingRow
              icon="moon-outline"
              iconColor={colors.primary}
              label="Modo Escuro"
              sublabel={isDark ? 'Ativado' : 'Desativado'}
              right={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFF"
                />
              }
            />
          </Card>

          {/* Export */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
            BACKUP E EXPORTAÇÃO
          </Text>
          <Card style={styles.card} noPadding>
            <SettingRow
              icon="cloud-download-outline"
              iconColor={colors.success}
              label="Exportar como JSON"
              sublabel="Backup completo dos seus dados"
              onPress={exportingJSON ? undefined : handleExportJSON}
              right={exportingJSON ? <ActivityIndicator size="small" color={colors.success} /> : undefined}
            />
            <SettingRow
              icon="document-text-outline"
              iconColor={colors.info}
              label="Exportar como CSV"
              sublabel="Planilha para Excel / Google Sheets"
              onPress={exportingCSV ? undefined : handleExportCSV}
              right={exportingCSV ? <ActivityIndicator size="small" color={colors.info} /> : undefined}
            />
          </Card>

          {/* About */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
            SOBRE
          </Text>
          <Card style={styles.card} noPadding>
            <SettingRow
              icon="information-circle-outline"
              iconColor={colors.textSecondary}
              label="CRM Vendas"
              sublabel="Versão 1.0.0"
            />
          </Card>

          {/* Danger */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
            CONTA
          </Text>
          <Card style={styles.card} noPadding>
            <SettingRow
              icon="log-out-outline"
              iconColor={colors.error}
              label="Sair da Conta"
              onPress={handleLogout}
              danger
            />
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { letterSpacing: -1 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sections: { paddingHorizontal: 16 },
  sectionLabel: {
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 4,
  },
  card: { marginBottom: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  iconBg: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: { flex: 1 },
  label: {},
  sublabel: { marginTop: 2 },
});