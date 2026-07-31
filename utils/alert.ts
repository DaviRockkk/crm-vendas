import { useAlertStore, AlertType } from '@/store/useAlertStore';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  type?: AlertType;
}

export function confirmAction({
  title,
  message,
  confirmText = 'Excluir',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'danger',
}: ConfirmOptions) {
  useAlertStore.getState().showAlert({
    title,
    message,
    type,
    confirmText,
    cancelText,
    showCancel: true,
    onConfirm,
    onCancel,
  });
}

export function showAlert(
  title: string,
  message: string,
  type: AlertType = 'warning',
  onConfirm?: () => void
) {
  useAlertStore.getState().showAlert({
    title,
    message,
    type,
    showCancel: false,
    onConfirm,
  });
}

export function showError(title: string, message: string, onConfirm?: () => void) {
  showAlert(title, message, 'danger', onConfirm);
}

export function showSuccess(title: string, message: string, onConfirm?: () => void) {
  showAlert(title, message, 'success', onConfirm);
}
