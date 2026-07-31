import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlertStore, AlertType } from '@/store/useAlertStore';
import { useTheme } from '@/hooks/useTheme';

export function CustomAlertModal() {
  const { isOpen, options, hideAlert } = useAlertStore();
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const [loading, setLoading] = useState(false);

  if (!isOpen || !options) return null;

  const {
    title,
    message,
    type = 'warning',
    confirmText,
    cancelText = 'Cancelar',
    showCancel = false,
    onConfirm,
    onCancel,
  } = options;

  async function handleConfirm() {
    if (onConfirm) {
      try {
        setLoading(true);
        await onConfirm();
      } catch (e) {
        console.error('Error executing alert confirm action:', e);
      } finally {
        setLoading(false);
      }
    }
    hideAlert();
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
    }
    hideAlert();
  }

  function getIconConfig(type: AlertType) {
    switch (type) {
      case 'danger':
        return {
          name: 'trash-outline' as const,
          color: colors.error,
          bg: colors.errorLight,
        };
      case 'success':
        return {
          name: 'checkmark-circle-outline' as const,
          color: colors.success,
          bg: colors.successLight,
        };
      case 'info':
        return {
          name: 'information-circle-outline' as const,
          color: colors.info,
          bg: colors.infoLight,
        };
      case 'warning':
      default:
        return {
          name: 'alert-circle-outline' as const,
          color: colors.warning,
          bg: colors.warningLight,
        };
    }
  }

  const iconConfig = getIconConfig(type);

  const getConfirmBg = () => {
    if (type === 'danger') return colors.error;
    if (type === 'success') return colors.success;
    return colors.primary;
  };

  const defaultConfirmText = showCancel
    ? type === 'danger'
      ? 'Excluir'
      : 'Confirmar'
    : 'OK';

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={showCancel ? handleCancel : undefined}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.container,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.xl,
                },
              ]}
            >
              {/* Badge Icon */}
              <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
                <Ionicons name={iconConfig.name} size={28} color={iconConfig.color} />
              </View>

              {/* Title & Message */}
              <Text style={[styles.title, { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }]}>
                {title}
              </Text>
              {!!message && (
                <Text style={[styles.message, { color: colors.textSecondary, fontSize: fontSize.base }]}>
                  {message}
                </Text>
              )}

              {/* Actions */}
              <View style={styles.actionsRow}>
                {showCancel && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                      },
                    ]}
                    onPress={handleCancel}
                    disabled={loading}
                  >
                    <Text style={[styles.cancelText, { color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.semibold }]}>
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.button,
                    {
                      backgroundColor: getConfirmBg(),
                      borderRadius: radius.md,
                      flex: showCancel ? 1 : undefined,
                      width: showCancel ? undefined : '100%',
                    },
                  ]}
                  onPress={handleConfirm}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.confirmText, { fontSize: fontSize.base, fontWeight: fontWeight.bold }]}>
                      {confirmText || defaultConfirmText}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    textAlign: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
