import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import packageJson from '@/package.json';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import { exportAllDataAsJSON, exportAllDataAsCSV } from '@/utils/export';
import { importBackupFromJSON, importBackupFromText } from '@/utils/import';
import { confirmAction, showError, showSuccess, showAlert } from '@/utils/alert';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const getManifestMessage = (manifestObj: any): string | null => {
  if (!manifestObj) return null;

  if (typeof manifestObj.message === 'string' && manifestObj.message.trim()) {
    return manifestObj.message.trim();
  }
  if (typeof manifestObj.metadata?.message === 'string' && manifestObj.metadata.message.trim()) {
    return manifestObj.metadata.message.trim();
  }
  if (typeof manifestObj.extra?.message === 'string' && manifestObj.extra.message.trim()) {
    return manifestObj.extra.message.trim();
  }
  if (typeof manifestObj.extra?.eas?.message === 'string' && manifestObj.extra.eas.message.trim()) {
    return manifestObj.extra.eas.message.trim();
  }
  if (
    typeof manifestObj.extra?.expoClient?.extra?.eas?.message === 'string' &&
    manifestObj.extra.expoClient.extra.eas.message.trim()
  ) {
    return manifestObj.extra.expoClient.extra.eas.message.trim();
  }
  if (
    typeof manifestObj.extra?.expoClient?.description === 'string' &&
    manifestObj.extra.expoClient.description.trim()
  ) {
    return manifestObj.extra.expoClient.description.trim();
  }

  return null;
};

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
  const { colors, fontSize, fontWeight } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border, backgroundColor: danger ? colors.error + '05' : 'transparent' }]}
      onPress={onPress}
      disabled={!onPress && !right}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={[styles.iconBg, { backgroundColor: iconColor + '20', borderRadius: 8 }]}>
        <Ionicons name={icon as any} size={18} color={danger ? colors.error : iconColor} />
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
  const { colors, isDark, toggleTheme, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const [user, setUser] = React.useState<string>('');
  const [exportingJSON, setExportingJSON] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [importingJSON, setImportingJSON] = useState(false);

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [restoringText, setRestoringText] = useState(false);

  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newUpdateMessage, setNewUpdateMessage] = useState<string | null>(null);

  const currentVersion = packageJson.version;
  const channelTag = Updates.channel ? ` (${Updates.channel})` : '';

  const currentManifest = (Updates.manifest as any);
  const currentUpdateMessage = getManifestMessage(currentManifest) || 'Versão estável atualizada.';

  async function handleCheckForUpdates() {
    setCheckingUpdates(true);
    try {
      if (__DEV__) {
        showError('Modo Desenvolvedor', 'A verificação de atualizações está desativada no ambiente de desenvolvimento.');
        setCheckingUpdates(false);
        return;
      }

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        const fetched = await Updates.fetchUpdateAsync();
        const fetchedManifest = fetched?.manifest || (fetched as any)?.manifest || (update as any)?.manifest;
        const message = getManifestMessage(fetchedManifest) || 'Nova atualização baixada com sucesso!';
        setNewUpdateMessage(message);
        setUpdateAvailable(true);

        showAlert(
          '🎉 Nova Atualização Pronta!',
          'Uma nova versão do CRM Vendas foi baixada e está pronta para ser aplicada.',
          'success',
          handleApplyUpdate,
          {
            confirmText: 'Reiniciar e Aplicar',
            cancelText: 'Mais Tarde',
            showCancel: true,
            notes: message,
          }
        );
      } else {
        showSuccess('App Atualizado', 'Nenhuma nova atualização encontrada para este aplicativo no momento.');
      }
    } catch (e: any) {
      showError('Erro ao buscar atualização', e.message ?? 'Não foi possível conectar ao servidor de atualizações.');
    } finally {
      setCheckingUpdates(false);
    }
  }

  async function handleApplyUpdate() {
    try {
      await Updates.reloadAsync();
    } catch (e: any) {
      showError('Erro ao reiniciar', e.message ?? 'Não foi possível reiniciar o aplicativo.');
    }
  }

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
      showError('Erro ao exportar', e.message ?? 'Tente novamente.');
    } finally {
      setExportingJSON(false);
    }
  }

  async function handleExportCSV() {
    setExportingCSV(true);
    try {
      await exportAllDataAsCSV();
    } catch (e: any) {
      showError('Erro ao exportar', e.message ?? 'Tente novamente.');
    } finally {
      setExportingCSV(false);
    }
  }

  async function handleFileImport() {
    setShowRestoreModal(false);
    setImportingJSON(true);
    try {
      const result = await importBackupFromJSON();
      if (!result.canceled && result.counts) {
        const { clients, products, sales, saleItems } = result.counts;
        showSuccess(
          'Backup Restaurado!',
          `Dados restaurados com sucesso:\n\n• ${clients} clientes\n• ${products} produtos\n• ${sales} vendas (${saleItems} itens)`
        );
      }
    } catch (e: any) {
      showError('Erro ao restaurar', e.message ?? 'Tente novamente.');
    } finally {
      setImportingJSON(false);
    }
  }

  async function handleTextImport() {
    if (!pasteText.trim()) {
      showError('Atenção', 'Cole o texto do JSON de backup no campo indicado.');
      return;
    }
    setRestoringText(true);
    try {
      const counts = await importBackupFromText(pasteText.trim());
      setShowRestoreModal(false);
      setPasteText('');
      if (counts) {
        showSuccess(
          'Backup Restaurado!',
          `Dados restaurados com sucesso:\n\n• ${counts.clients} clientes\n• ${counts.products} produtos\n• ${counts.sales} vendas (${counts.saleItems} itens)`
        );
      }
    } catch (e: any) {
      showError('Erro ao restaurar', e.message ?? 'Verifique se o texto copiado está completo.');
    } finally {
      setRestoringText(false);
    }
  }

  async function handleLogout() {
    confirmAction({
      title: 'Sair da conta',
      message: 'Tem certeza que deseja sair?',
      confirmText: 'Sair',
      type: 'danger',
      onConfirm: async () => {
        await supabase.auth.signOut();
      },
    });
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
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

          {/* Export & Import */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
            BACKUP E EXPORTAÇÃO
          </Text>
          <Card style={styles.card} noPadding>
            <SettingRow
              icon="cloud-upload-outline"
              iconColor={colors.warning}
              label="Restaurar Backup (JSON)"
              sublabel="Importar por arquivo ou colar texto"
              onPress={() => setShowRestoreModal(true)}
              right={importingJSON ? <ActivityIndicator size="small" color={colors.warning} /> : undefined}
            />
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

          {/* Version & Updates */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
            VERSÃO E ATUALIZAÇÕES
          </Text>
          <Card style={styles.card} noPadding>
            <SettingRow
              icon="information-circle-outline"
              iconColor={colors.info}
              label="Versão do Aplicativo"
              sublabel={`v${currentVersion}${channelTag}`}
            />
            <SettingRow
              icon="git-commit-outline"
              iconColor={colors.primary}
              label="Update Ativo"
              sublabel={currentUpdateMessage}
            />
            {updateAvailable ? (
              <SettingRow
                icon="checkmark-circle-outline"
                iconColor={colors.success}
                label="Reiniciar e Aplicar Atualização"
                sublabel={`Nova versão pronta: ${newUpdateMessage}`}
                onPress={handleApplyUpdate}
                right={<Ionicons name="reload-circle" size={24} color={colors.success} />}
              />
            ) : (
              <SettingRow
                icon="refresh-outline"
                iconColor={colors.primary}
                label="Buscar Atualizações"
                sublabel="Verificar se há novas atualizações disponíveis"
                onPress={checkingUpdates ? undefined : handleCheckForUpdates}
                right={checkingUpdates ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
              />
            )}
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

      {/* Restore Options Modal */}
      <Modal visible={showRestoreModal} animationType="slide" presentationStyle="formSheet">
        <ScrollView contentContainerStyle={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }}>
              Restaurar Backup
            </Text>
            <TouchableOpacity onPress={() => setShowRestoreModal(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: 16 }}>
            Escolha como prefere restaurar seus dados de backup:
          </Text>

          {/* Option 1: File picker */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
            ]}
            onPress={handleFileImport}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="folder-open-outline" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.bold }}>
                📁 Escolher Arquivo no Celular
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
                Selecione o arquivo .json ou .txt nos Downloads, WhatsApp ou Drive
              </Text>
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginHorizontal: 12, fontWeight: fontWeight.bold }}>
              OU
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          {/* Option 2: Paste text */}
          <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.bold, marginBottom: 6 }}>
            📋 Colar Texto do Backup (JSON)
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginBottom: 10 }}>
            Se o celular não permitir baixar o arquivo, abra o arquivo de backup no celular, copie o texto e cole abaixo:
          </Text>

          <TextInput
            style={[
              styles.pasteInput,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.text,
                fontSize: fontSize.sm,
              },
            ]}
            multiline
            numberOfLines={6}
            placeholder="Cole o código JSON do backup aqui..."
            placeholderTextColor={colors.textTertiary}
            value={pasteText}
            onChangeText={setPasteText}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Button
              label="Restaurar a partir do Texto"
              onPress={handleTextImport}
              loading={restoringText}
              disabled={!pasteText.trim() || restoringText}
              style={{ flex: 1 }}
              size="lg"
            />
            <Button
              label="Cancelar"
              variant="outline"
              onPress={() => setShowRestoreModal(false)}
              style={{ flex: 1 }}
              size="lg"
            />
          </View>
        </ScrollView>
      </Modal>
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
  modalContent: {
    padding: 24,
    paddingTop: 32,
    flexGrow: 1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasteInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
  },
});