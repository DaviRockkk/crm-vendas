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
import { crmClients, crmSales } from '@/services/crmService';
import { Client, SaleWithClient } from '@/services/database.types';

export default function SalesScreen() {
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sales, setSales] = useState<SaleWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const allSales = await crmSales.getAll();
      const allClients = await crmClients.getAll();
      setSales(allSales);
      setClients(allClients);
    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
      if (clientId) {
        setSelectedClientId(clientId);
        setModalVisible(true);
        router.setParams({ clientId: undefined });
      }
    }, [clientId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRegisterSale = async () => {
    if (!selectedClientId) {
      alert('Por favor, selecione um cliente.');
      return;
    }
    if (!description.trim()) {
      alert('Por favor, insira a descrição da venda.');
      return;
    }
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Por favor, insira um valor válido.');
      return;
    }

    setSubmitting(true);
    try {
      await crmSales.create(selectedClientId, description, parsedAmount, status);
      // Reset Form
      setSelectedClientId('');
      setDescription('');
      setAmount('');
      setStatus('paid');
      setModalVisible(false);
      // Reload
      loadData();
    } catch (error) {
      console.error('Error creating sale:', error);
      alert('Erro ao registrar venda.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Filtragem e pesquisa
  const filteredSales = sales
    .filter((sale) => {
      if (filter === 'paid') return sale.status === 'paid';
      if (filter === 'pending') return sale.status === 'pending';
      return true;
    })
    .filter((sale) => {
      const clientName = sale.client?.name.toLowerCase() || '';
      const desc = sale.description.toLowerCase();
      const query = searchQuery.toLowerCase();
      return clientName.includes(query) || desc.includes(query);
    })
    .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());

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
              Vendas
            </ThemedText>
            <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
              <ThemedText type="smallBold" style={styles.addButtonText}>
                + Nova Venda
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Gerencie e registre as vendas do dia a dia
          </ThemedText>
        </View>

        {/* Barra de Pesquisa */}
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar por cliente ou item..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Filtros */}
        <View style={styles.filterContainer}>
          {(['all', 'paid', 'pending'] as const).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.filterButton,
                filter === type && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(type)}
            >
              <ThemedText
                type="smallBold"
                style={[
                  styles.filterText,
                  filter === type && styles.filterTextActive,
                ]}
              >
                {type === 'all' ? 'Todas' : type === 'paid' ? 'Pagas' : 'Pendentes'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Lista de Vendas */}
        <FlatList
          data={filteredSales}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#208AEF" />
          }
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Nenhuma venda encontrada.
            </ThemedText>
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.saleCard}>
              <View style={styles.saleHeader}>
                <View>
                  <ThemedText type="smallBold">{item.client?.name || 'Cliente deletado'}</ThemedText>
                  <ThemedText type="code" themeColor="textSecondary">
                    {formatDate(item.sale_date)}
                  </ThemedText>
                </View>
                <ThemedView
                  type="backgroundSelected"
                  style={[
                    styles.statusBadge,
                    item.status === 'paid' ? styles.badgePaid : styles.badgePending,
                  ]}
                >
                  <ThemedText
                    type="code"
                    style={item.status === 'paid' ? styles.statusPaidText : styles.statusPendingText}
                  >
                    {item.status === 'paid' ? 'PAGO' : 'PENDENTE'}
                  </ThemedText>
                </ThemedView>
              </View>

              <View style={styles.saleBody}>
                <ThemedText type="default" style={styles.saleDesc}>
                  {item.description}
                </ThemedText>
                <ThemedText type="smallBold" style={styles.saleAmount}>
                  {formatCurrency(item.amount)}
                </ThemedText>
              </View>
            </ThemedView>
          )}
        />

        {/* Modal para Registrar Nova Venda */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalContainer}>
              <ThemedText type="default" style={styles.modalTitle}>
                Nova Venda
              </ThemedText>

              {clients.length === 0 ? (
                <View style={styles.noClientsContainer}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.noClientsText}>
                    Você precisa cadastrar pelo menos um cliente antes de registrar uma venda.
                  </ThemedText>
                  <Pressable
                    style={styles.modalAddClientButton}
                    onPress={() => {
                      setModalVisible(false);
                      router.push('/clients');
                    }}
                  >
                    <ThemedText type="smallBold" style={styles.addButtonText}>
                      Cadastrar Cliente
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
                  {/* Seleção do Cliente */}
                  <ThemedText type="small" style={styles.label}>
                    Cliente
                  </ThemedText>
                  <View style={styles.pickerContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientPicker}>
                      <Pressable
                        style={[styles.clientChip, styles.addNewClientChip]}
                        onPress={() => {
                          setModalVisible(false);
                          router.push({ pathname: '/clients', params: { addNew: 'true' } });
                        }}
                      >
                        <ThemedText type="smallBold" style={styles.addNewClientChipText}>
                          ➕ Novo Cliente
                        </ThemedText>
                      </Pressable>

                      {clients.map((c) => (
                        <Pressable
                          key={c.id}
                          style={[
                            styles.clientChip,
                            selectedClientId === c.id && styles.clientChipActive,
                          ]}
                          onPress={() => setSelectedClientId(c.id)}
                        >
                          <ThemedText
                            type="small"
                            style={[
                              styles.clientChipText,
                              selectedClientId === c.id && styles.clientChipTextActive,
                            ]}
                          >
                            {c.name}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Descrição */}
                  <ThemedText type="small" style={styles.label}>
                    Descrição da Venda (Ex: Camisa, Perfume...)
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="O que foi vendido?"
                    placeholderTextColor="#999"
                    value={description}
                    onChangeText={setDescription}
                  />

                  {/* Valor */}
                  <ThemedText type="small" style={styles.label}>
                    Valor (R$)
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="0,00"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />

                  {/* Status do pagamento */}
                  <ThemedText type="small" style={styles.label}>
                    Status do Pagamento
                  </ThemedText>
                  <View style={styles.statusToggleContainer}>
                    <Pressable
                      style={[
                        styles.toggleButton,
                        status === 'paid' && styles.toggleButtonPaidActive,
                      ]}
                      onPress={() => setStatus('paid')}
                    >
                      <ThemedText
                        type="smallBold"
                        style={[
                          styles.toggleText,
                          status === 'paid' && styles.toggleTextActive,
                        ]}
                      >
                        Já Pago (Pix / Dinheiro)
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.toggleButton,
                        status === 'pending' && styles.toggleButtonPendingActive,
                      ]}
                      onPress={() => setStatus('pending')}
                    >
                      <ThemedText
                        type="smallBold"
                        style={[
                          styles.toggleText,
                          status === 'pending' && styles.toggleTextActive,
                        ]}
                      >
                        Dívida (Pendente)
                      </ThemedText>
                    </Pressable>
                  </View>

                  {/* Ações */}
                  <View style={styles.formActions}>
                    <Pressable
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => setModalVisible(false)}
                    >
                      <ThemedText type="smallBold">Cancelar</ThemedText>
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.saveButton]}
                      onPress={handleRegisterSale}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <ThemedText type="smallBold" style={styles.saveButtonText}>
                          Salvar Venda
                        </ThemedText>
                      )}
                    </Pressable>
                  </View>
                </ScrollView>
              )}
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
    marginBottom: Spacing.two,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  filterButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: '#208AEF',
  },
  filterText: {
    color: '#60646C',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.six,
  },
  saleCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  badgePaid: {
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
  },
  badgePending: {
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
  },
  statusPaidText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  statusPendingText: {
    color: '#D32F2F',
    fontWeight: '700',
  },
  saleBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleDesc: {
    fontWeight: '500',
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: '600',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  noClientsContainer: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
  },
  noClientsText: {
    textAlign: 'center',
  },
  modalAddClientButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
  },
  formContainer: {
    gap: Spacing.two,
  },
  label: {
    marginTop: Spacing.two,
    fontWeight: '600',
  },
  pickerContainer: {
    height: 48,
    marginVertical: Spacing.one,
  },
  clientPicker: {
    flexDirection: 'row',
  },
  clientChip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginRight: Spacing.two,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientChipActive: {
    backgroundColor: '#208AEF',
  },
  clientChipText: {
    color: 'inherit',
  },
  clientChipTextActive: {
    color: '#fff',
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
  statusToggleContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    alignItems: 'center',
  },
  toggleButtonPaidActive: {
    backgroundColor: '#2E7D32',
  },
  toggleButtonPendingActive: {
    backgroundColor: '#D32F2F',
  },
  toggleText: {
    color: 'inherit',
  },
  toggleTextActive: {
    color: '#fff',
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
  addNewClientChip: {
    backgroundColor: 'rgba(32, 138, 239, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(32, 138, 239, 0.25)',
  },
  addNewClientChipText: {
    color: '#208AEF',
  },
});