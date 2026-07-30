import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
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
      enableVibrate: true,
      showBadge: true,
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
        sound: true,
        badge: 1,
        color: '#4F46E5',
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
        sound: true,
        badge: 1,
        color: '#4F46E5',
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

export type TestNotificationType = 'due_before' | 'due_today' | 'overdue' | 'system_test';

export async function sendTestNotification(type: TestNotificationType): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) {
    throw new Error('Permissão de notificação não concedida.');
  }

  let title = '';
  let body = '';

  switch (type) {
    case 'due_before':
      title = '⚠️ Vencimento Amanhã';
      body = 'João Silva possui R$ 250,00 vencendo amanhã.';
      break;
    case 'due_today':
      title = '🔴 Pagamento Vencendo Hoje';
      body = 'Maria Souza possui R$ 500,00 com vencimento hoje.';
      break;
    case 'overdue':
      title = '🚨 Pagamento Atrasado';
      body = 'Carlos Santos possui cobrança pendente há 5 dias (R$ 180,00).';
      break;
    case 'system_test':
      title = '🔔 Notificação de Teste';
      body = 'O sistema de lembretes do CRM Vendas está ativo e operacional!';
      break;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { test: true, type },
      sound: true,
      badge: 1,
      color: '#4F46E5',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      repeats: false,
    },
  });
}