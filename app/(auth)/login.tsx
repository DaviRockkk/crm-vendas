import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';

export default function LoginScreen() {
  const { colors, fontSize, fontWeight, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Preencha o e-mail e a senha.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('Conta criada!', 'Verifique seu e-mail para confirmar o cadastro.', [
          { text: 'OK', onPress: () => setMode('login') },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#4F46E5', '#7C3AED', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { paddingTop: insets.top + 40 }]}
      >
        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Ionicons name="briefcase" size={32} color="#FFFFFF" />
          </View>
          <Text style={[styles.appName, { fontSize: fontSize['3xl'], fontWeight: fontWeight.extrabold }]}>
            CRM Vendas
          </Text>
          <Text style={[styles.appTagline, { fontSize: fontSize.base }]}>
            Gerencie seus clientes e vendas
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.formContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.formInner,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingBottom: insets.bottom + 24,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={[
              styles.formTitle,
              { color: colors.text, fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
            ]}
          >
            {mode === 'login' ? 'Entrar na conta' : 'Criar conta'}
          </Text>
          <Text style={[styles.formSubtitle, { color: colors.textSecondary, fontSize: fontSize.base }]}>
            {mode === 'login'
              ? 'Acesse seu painel de controle'
              : 'Comece a gerenciar seus negócios'}
          </Text>

          <Input
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textTertiary} />}
          />

          <Input
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Sua senha"
            secureTextEntry={!showPassword}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />}
            rightIcon={
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.textTertiary}
              />
            }
            onRightIconPress={() => setShowPassword((v) => !v)}
          />

          <Button
            label={mode === 'login' ? 'Entrar' : 'Criar Conta'}
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginTop: 8, marginBottom: 16 }}
          />

          <Button
            label={
              mode === 'login'
                ? 'Não tem conta? Cadastre-se'
                : 'Já tem conta? Entrar'
            }
            variant="ghost"
            onPress={() => setMode((m) => (m === 'login' ? 'signup' : 'login'))}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gradient: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  logoArea: {
    alignItems: 'center',
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  appName: {
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 8,
  },
  appTagline: {
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    marginTop: -24,
  },
  formInner: {
    padding: 24,
    paddingTop: 32,
    flexGrow: 1,
  },
  formTitle: {
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  formSubtitle: {
    marginBottom: 28,
  },
});