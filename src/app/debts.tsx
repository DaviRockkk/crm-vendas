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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { crmClients, crmSales, crmPayments } from '@/services/crmService';
import { ClientWithBalance, Sale, Payment } from '@/services/database.types';

export default function DebtsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [debtors, setDebtors] = useState<ClientWithBalance[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Modal State (Detalhes do cliente com dívidas pendentes)
  const [selectedDebtor, setSelectedDebtor] = useState<ClientWithBalance | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  // Modal State (Registro de novo pagamento)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const loadData = async () => {
    try {
      const allClients = await crmClients.getAll();
      const allSales = await crmSales.getAll();
      const allPayments = await crmPayments.getAll();

      // Filtrar apenas clientes que de fato devem
      setDebtors(allClients.filter((c) => c.total_debt > 0));
      setSales(allSales);
      setPayments(allPayments);
    } catch (error) {
      console.error('Erro carregando dividas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Abre detalhes das dívidas de um cliente
  const handleOpenDetails = (client: ClientWithBalance) => {
    setSelectedDebtor(client);
    setDetailsModalVisible(true);
  };

  // Abre registro de pagamento para uma venda específica
  const handleOpenPaymentRegister = (sale: Sale) => {
    setSelectedSale(sale);
    // Calcula valor restante devido para sugerir no input
    const salePayments = payments.filter((p) => p.sale_id === sale.id);
    const paidOnSale = salePayments.reduce((acc, p) => acc + p.amount, 0);
    const remaining = Math.max(0, sale.amount - paidOnSale);
    setPaymentAmount(remaining.toString());
    setPaymentModalVisible(true);
  };

  const handleRegisterPayment = async () => {
    if (!selectedSale) return;
    const amount = parseFloat(paymentAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, insira um valor de pagamento válido.');
      return;
    }

    setSubmittingPayment(true);
    try {
      await crmPayments.create(selectedSale.id, amount);
      setPaymentModalVisible(false);
      
      // Recarrega os dados ao fechar o modal de pagamentos
      await loadData();

      // Atualiza o cliente devedor selecionado no modal de detalhes
      if (selectedDebtor) {
        const updatedClients = await crmClients.getAll();
        const updatedDebtor = updatedClients.find((c) => c.id === selectedDebtor.id);
        if (updatedDebtor && updatedDebtor.total_debt > 0) {
          setSelectedDebtor(updatedDebtor);
        } else {
          // Se quitou tudo, fecha o modal de detalhes
          setDetailsModalVisible(false);
          setSelectedDebtor(null);
        }
      }
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      alert('Erro ao registrar pagamento.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Gera e envia mensagem amigável no WhatsApp
  const handleSendWhatsAppNotification = (client: ClientWithBalance) => {
    const clientSales = sales.filter((s) => s.client_id === client.id && s.status === 'pending');
    const descriptions = clientSales.map((s) => s.description).join(', ');
    const debtAmountStr = formatCurrency(client.total_debt);

    const message = `Olá, ${client.name}! Tudo bem? Passando para te lembrar da pendência de ${debtAmountStr} referente à compra de (${descriptions}). Se puder me enviar por Pix, agradeço bastante! Qualquer dúvida estou à disposição. Abraço!`;
    
    const cleanPhone = client.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 11 || cleanPhone.length === 10
      ? `55${cleanPhone}`
      : cleanPhone;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      alert('Não foi possível abrir o WhatsApp. Verifique se o aplicativo está instalado.');
    });
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getSaleRemainingDebt = (sale: Sale) => {
    const salePayments = payments.filter((p) => p.sale_id === sale.id);
    const paidOnSale = salePayments.reduce((acc, p) => acc + p.amount, 0);
    return Math.max(0, sale.amount - paidOnSale);
  };

  const totalOutstanding = debtors.reduce((acc, c) => acc + c.total_debt, 0);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#208AEF" />
      </ThemedView>
    );
  }

  // Filtrar as vendas pendentes específicas do cliente ativo no modal
  const selectedClientPendingSales = selectedDebtor
    ? sales.filter((s) => s.client_id === selectedDebtor.id && s.status === 'pending')
    : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Dívidas & Cobranças
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Acompanhe quem está devendo e envie lembretes amigáveis
          </ThemedText>
        </View>

        {/* Resumo de Dívidas */}
        <ThemedView type="backgroundElement" style={styles.summaryCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Total a Receber Pendente
          </ThemedText>
          <ThemedText type="title" themeColor="error" style={styles.summaryValue}>
            {formatCurrency(totalOutstanding)}
          </ThemedText>
          <ThemedText type="code">
            {debtors.length} {debtors.length === 1 ? 'cliente inadimplente' : 'clientes devedores'}
          </ThemedText>
        </ThemedView>

        {/* Lista de Devedores */}
        <FlatList
          data={debtors}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#208AEF" />
          }
          ListEmptyComponent={
            <ThemedText type="small" themeColor="success" style={styles.emptyText}>
              Nenhum saldo devedor pendente! Todos os clientes em dia. 🎉
            </ThemedText>
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.debtorCard}>
              <View style={styles.debtorHeader}>
                <View>
                  <ThemedText type="default" style={styles.debtorName}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="code" themeColor="textSecondary">
                    {item.phone}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" themeColor="error" style={styles.debtorAmount}>
                  {formatCurrency(item.total_debt)}
                </ThemedText>
              </View>

              <View style={styles.debtorActions}>
                <Pressable
                  style={[styles.actionButton, styles.detailsButton]}
                  onPress={() => handleOpenDetails(item)}
                >
                  <ThemedText type="smallBold">Ver Contas</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.whatsappButton]}
                  onPress={() => handleSendWhatsAppNotification(item)}
                >
                  <ThemedText type="smallBold" style={styles.whatsappButtonText}>
                    💬 Cobrar WhatsApp
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          )}
        />

        {/* Modal Detalhes do Cliente Devedor */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={detailsModalVisible}
          onRequestClose={() => setDetailsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.modalContainer}>
              <ThemedText type="default" style={styles.modalTitle}>
                Contas pendentes: {selectedDebtor?.name}
              </ThemedText>

              <ScrollView contentContainerStyle={styles.detailsList}>
                {selectedClientPendingSales.map((sale) => {
                  const debt = getSaleRemainingDebt(sale);
                  return (
                    <ThemedView key={sale.id} type="backgroundSelected" style={styles.pendingSaleItem}>
                      <View style={styles.pendingSaleHeader}>
                        <ThemedText type="smallBold">{sale.description}</ThemedText>
                        <ThemedText type="smallBold" themeColor="error">
                          Falta: {formatCurrency(debt)}
                        </ThemedText>
                      </View>
                      <View style={styles.pendingSaleFooter}>
                        <ThemedText type="code" themeColor="textSecondary">
                          Total da Venda: {formatCurrency(sale.amount)}
                        </ThemedText>
                        <Pressable
                          style={styles.payButton}
                          onPress={() => handleOpenPaymentRegister(sale)}
                        >
                          <ThemedText type="smallBold" style={styles.payButtonText}>
                            Dar Baixa
                          </ThemedText>
                        </Pressable>
                      </View>
                    </ThemedView>
                  );
                })}
              </ScrollView>

              <Pressable
                style={[styles.closeModalButton, { marginTop: Spacing.three }]}
                onPress={() => setDetailsModalVisible(false)}
              >
                <ThemedText type="smallBold">Fechar</ThemedText>
              </Pressable>
            </ThemedView>
          </View>
        </Modal>

        {/* Modal de Registro de Pagamento */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={paymentModalVisible}
          onRequestClose={() => setPaymentModalVisible(false)}
        >
          <View style={styles.paymentModalOverlay}>
            <ThemedView type="backgroundElement" style={styles.paymentModalContainer}>
              <ThemedText type="default" style={styles.modalTitle}>
                Registrar Pagamento
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.paymentSubtext}>
                Referente a: &quot;{selectedSale?.description}&quot;
              </ThemedText>

              <ThemedText type="small" style={styles.label}>
                Valor Recebido (R$)
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
              />

              <View style={styles.formActions}>
                <Pressable
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => setPaymentModalVisible(false)}
                >
                  <ThemedText type="smallBold">Cancelar</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleRegisterPayment}
                  disabled={submittingPayment}
                >
                  {submittingPayment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <ThemedText type="smallBold" style={styles.saveButtonText}>
                      Confirmar
                    </ThemedText>
                  )}
                </Pressable>
              </View>
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
  headerTitle: {
    fontWeight: '700',
  },
  summaryCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    marginBottom: Spacing.three,
  },
  summaryValue: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    marginVertical: Spacing.one,
  },
  listContent: {
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.six,
  },
  debtorCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
  debtorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debtorName: {
    fontSize: 18,
    fontWeight: '600',
  },
  debtorAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  debtorActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButton: {
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  whatsappButtonText: {
    color: '#fff',
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
  detailsList: {
    gap: Spacing.two,
  },
  pendingSaleItem: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
  pendingSaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pendingSaleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  payButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.one,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  closeModalButton: {
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  paymentModalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    elevation: 5,
  },
  paymentSubtext: {
    marginBottom: Spacing.three,
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
    marginVertical: Spacing.one,
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
  formActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
});