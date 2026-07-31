import { create } from 'zustand';

export type AlertType = 'danger' | 'warning' | 'info' | 'success';

export interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface AlertState {
  isOpen: boolean;
  options: AlertOptions | null;
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  isOpen: false,
  options: null,
  showAlert: (options) => set({ isOpen: true, options }),
  hideAlert: () => set({ isOpen: false, options: null }),
}));
