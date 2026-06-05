import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
  Pressable,
  Modal,
  TextInput,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { crmClients } from '@/services/crmService';
import { ClientWithBalance } from '@/services/database.types';

export default function ClientsScreen() {
  const { addNew } = useLocalSearchParams<{ addNew?: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState<ClientWithBalance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form / Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithBalance | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const allClients = await crmClients.getAll();
      setClients(allClients);
    } catch (error) {
      console.error('Erro carregando clientes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openAddModal = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setModalVisible(true);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
      if (addNew === 'true') {
        openAddModal();
        router.setParams({ addNew: undefined });
      }
    }, [addNew])
  );

  const openEditModal = (client: ClientWithBalance) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone);
    setEmail(client.email || '');
    setNotes(client.notes || '');
    setModalVisible(true);
  };

  const handleSaveClient = async () => {
    if (!name.trim()) {
      alert('Por favor, insira o nome do cliente.');
      return;
    }
    if (!phone.trim()) {
      alert('Por favor, insira o telefone.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingClient) {
        await crmClients.update(editingClient.id, name, phone, email, notes);
      } else {
        await crmClients.create(name, phone, email, notes);
      }
      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Filtragem
  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#208AEF" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <ThemedText type="subtitle" style={styles.headerTitle}>
              Clientes
            </ThemedText>
            <Pressable style={styles.addButton} onPress={openAddModal}>
              <ThemedText type="smallBold" style={styles.addButtonText}>
                + Novo Cliente
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Cadastro e histórico financeiro de clientes
          </ThemedText>
        </View>

        {/* Busca */}
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente por nome ou telefone..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Lista */}
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#208AEF" />
          }
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Nenhum cliente cadastrado.
            </ThemedText>
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable onPress={() => openEditModal(item)}>
              <ThemedView type="backgroundElement" style={styles.clientCard}>
                <View style={styles.clientInfo}>
                  <ThemedText type="default" style={styles.clientName}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="code" themeColor="textSecondary">
                    📞 {item.phone}
                  </ThemedText>
                  {item.notes ? (
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.clientNotes}>
                      📝 {item.notes}
                    </ThemedText>
                  ) : null}
                </View>

                {/* Balanço financeiro do cliente */}
                <View style={styles.clientBalance}>
                  <View style={styles.balanceRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Compras:
                    </ThemedText>
                    <ThemedText type="smallBold" themeColor="success">
                      {formatCurrency(item.total_spent)}
                    </ThemedText>
                  </View>
                  {item.total_debt > 0 ? (
                    <View style={styles.balanceRow}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Devendo:
                      </ThemedText>
                      <ThemedText type="smallBold" themeColor="error">
                        {formatCurrency(item.total_debt)}
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={styles.balanceRow}>
                      <ThemedText type="small" themeColor="success">
                        Sem dívidas
                      </ThemedText>
                    </View>
                  )}
                </View>
              </ThemedView>
            </Pressable>
          )}
        />

        {/* Modal Novo/Editar Cliente */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalContainer}>
              <ThemedText type="default" style={styles.modalTitle}>
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </ThemedText>

              <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
                <ThemedText type="small" style={styles.label}>
                  Nome Completo
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Nome do cliente"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                />

                <ThemedText type="small" style={styles.label}>
                  Telefone / WhatsApp
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="(00) 90000-0000"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />

                <ThemedText type="small" style={styles.label}>
                  E-mail (Opcional)
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="email@exemplo.com"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />

                <ThemedText type="small" style={styles.label}>
                  Anotações / Observações (Opcional)
                </ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Preferências, endereço, detalhes adicionais..."
                  placeholderTextColor="#999"
                  multiline={true}
                  numberOfLines={3}
                  value={notes}
                  onChangeText={setNotes}
                />

                {editingClient && (
                  <Pressable
                    style={styles.modalSaleButton}
                    onPress={() => {
                      setModalVisible(false);
                      router.push({ pathname: '/sales', params: { clientId: editingClient.id } });
                    }}
                  >
                    <ThemedText type="smallBold" style={styles.modalSaleButtonText}>
                      💰 Registrar Venda para {editingClient.name}
                    </ThemedText>
                  </Pressable>
                )}

                <View style={styles.formActions}>
                  <Pressable
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <ThemedText type="smallBold">Cancelar</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.saveButton]}
                    onPress={handleSaveClient}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <ThemedText type="smallBold" style={styles.saveButtonText}>
                        Salvar
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </ThemedView>
          </View>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginVertical: Spacing.three,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  headerTitle: {
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  addButtonText: {
    color: '#fff',
  },
  searchInput: {
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    color: 'inherit',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
    marginBottom: Spacing.three,
  },
  listContent: {
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.six,
  },
  clientCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientInfo: {
    flex: 1,
    gap: Spacing.one,
    paddingRight: Spacing.two,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
  },
  clientNotes: {
    marginTop: Spacing.half,
    fontSize: 13,
  },
  clientBalance: {
    alignItems: 'flex-end',
    gap: Spacing.one,
    minWidth: 110,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: Spacing.one,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    padding: Spacing.four,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  formContainer: {
    gap: Spacing.two,
  },
  label: {
    marginTop: Spacing.two,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    color: 'inherit',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  saveButton: {
    backgroundColor: '#208AEF',
  },
  saveButtonText: {
    color: '#fff',
  },
  modalSaleButton: {
    backgroundColor: 'rgba(32, 138, 239, 0.12)',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(32, 138, 239, 0.25)',
  },
  modalSaleButtonText: {
    color: '#208AEF',
    fontWeight: '700',
  },
});