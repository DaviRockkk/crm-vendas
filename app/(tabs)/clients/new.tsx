import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useClient, useCreateClient, useUpdateClient } from '@/hooks/useClients';
import { useTheme } from '@/hooks/useTheme';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

import { maskPhone } from '@/utils/format';

export default function ClientFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id && id !== 'new';
  const { colors, fontSize } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: existing, isLoading: loadingExisting } = useClient(id ?? '');
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setPhone(existing.phone ? maskPhone(existing.phone) : '');
      setNotes(existing.notes ?? '');
    }
  }, [existing]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Atenção', 'O nome do cliente é obrigatório.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length < 10) {
      Alert.alert('Atenção', 'Informe um número de telefone válido com DDD (ex: 11 99999-9999).');
      return;
    }

    try {
      if (isEditing && id) {
        await updateClient.mutateAsync({ id, name: name.trim(), phone: phone.trim() || null, notes: notes.trim() || null });
      } else {
        await createClient.mutateAsync({ name: name.trim(), phone: phone.trim() || null, notes: notes.trim() || null });
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível salvar o cliente.');
    }
  }

  if (isEditing && loadingExisting) return <LoadingSpinner fullScreen />;

  const isSaving = createClient.isPending || updateClient.isPending;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header
        title={isEditing ? 'Editar Cliente' : 'Novo Cliente'}
        showBack
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Nome *"
            value={name}
            onChangeText={setName}
            placeholder="Nome completo do cliente"
            autoCapitalize="words"
            leftIcon={<Ionicons name="person-outline" size={18} color={colors.textTertiary} />}
          />

          <Input
            label="Telefone / WhatsApp"
            value={phone}
            onChangeText={(v) => setPhone(maskPhone(v))}
            placeholder="(11) 99999-9999"
            maxLength={15}
            keyboardType="phone-pad"
            leftIcon={<Ionicons name="call-outline" size={18} color={colors.textTertiary} />}
            hint="Use o número completo com DDD para o link do WhatsApp."
          />

          <Input
            label="Observações"
            value={notes}
            onChangeText={setNotes}
            placeholder="Anotações sobre o cliente..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{ height: 100, paddingTop: 12 }}
            leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.textTertiary} />}
          />

          <Button
            label={isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            onPress={handleSave}
            loading={isSaving}
            fullWidth
            size="lg"
            style={{ marginTop: 8 }}
          />

          <Button
            label="Cancelar"
            variant="ghost"
            onPress={() => router.back()}
            fullWidth
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 20 },
});