import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('crm-vendas', {
      name: 'CRM Vendas',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function scheduleDueDateNotification(
  saleId: string,
  clientName: string,
  dueAmount: number,
  dueDate: Date,
): Promise<void> {
  // Cancela notificações existentes para esta venda
  await cancelNotificationsForSale(saleId);

  const now = new Date();
  const dayBefore = new Date(dueDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(9, 0, 0, 0);

  const onDay = new Date(dueDate);
  onDay.setHours(9, 0, 0, 0);

  const amountStr = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(dueAmount);

  // Notificação 1 dia antes
  if (dayBefore > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `sale-${saleId}-before`,
      content: {
        title: '⚠️ Vencimento Amanhã',
        body: `${clientName} possui ${amountStr} vencendo amanhã.`,
        data: { saleId, type: 'due_before' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dayBefore,
      },
    });
  }

  // Notificação no dia do vencimento
  if (onDay > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `sale-${saleId}-due`,
      content: {
        title: '🔴 Pagamento Vencendo Hoje',
        body: `${clientName} possui ${amountStr} com vencimento hoje.`,
        data: { saleId, type: 'due_today' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: onDay,
      },
    });
  }
}

export async function cancelNotificationsForSale(saleId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`sale-${saleId}-before`).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(`sale-${saleId}-due`).catch(() => {});
}