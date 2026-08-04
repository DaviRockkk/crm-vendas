import { useEffect, useState } from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermissions } from '@/lib/notifications';
import { useThemeStore } from '@/store/useThemeStore';
import { CustomAlertModal } from '@/components/ui/CustomAlertModal';
import type { Session } from '@supabase/supabase-js';

SplashScreen.preventAutoHideAsync();

function AuthGuard({ children, session }: { children: React.ReactNode; session: Session | null }) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, segments]);

  return <>{children}</>;
}

import { useRealtimeSync } from '@/hooks/useRealtimeSync';

function RealtimeListener() {
  useRealtimeSync();
  return null;
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setReady(true);
      SplashScreen.hideAsync();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    requestNotificationPermissions().catch(() => {});

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D1117', alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={require('@/assets/images/crm-logo-whiteText-noBG.png')}
          style={{ width: 220, height: 75 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <RealtimeListener />
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AuthGuard session={session}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthGuard>
        <CustomAlertModal />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}