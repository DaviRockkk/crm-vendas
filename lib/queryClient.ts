import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, AppStateStatus, Platform } from 'react-native';

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

AppState.addEventListener('change', onAppStateChange);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,                   // Considera dados desatualizados imediatamente após mutações/foco
      gcTime: 30 * 60 * 1000,         // 30 minutos (cache offline)
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});