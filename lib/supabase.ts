import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Fallbacks de produção integrados para garantir funcionamento correto em builds locais/EAS na nuvem
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://meyenbogwlmpvrosgvol.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_lBhY6603kbIsxDBunfkc7Q_dQ_A7yLW';

// Wrapper SSR-safe para evitar "window is not defined" no bundler Web / Node.js
const customStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return Promise.resolve(null);
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return Promise.resolve();
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return Promise.resolve();
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: typeof window !== 'undefined',
    persistSession: typeof window !== 'undefined',
    detectSessionInUrl: false,
  },
});