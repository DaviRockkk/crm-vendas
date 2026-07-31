import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCreateSale } from '@/hooks/useSales';
import { useClients } from '@/hooks/useClients';
import { useProducts, useCreateProduct } from '@/hooks/useProducts';
import { useTheme } from '@/hooks/useTheme';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency, maskCurrency, parseCurrency, getDefaultDueDate, getInstallmentDueDates, calculateInstallmentsDetail, formatDate, getTodayDate } from '@/utils/format';
import { showAlert, showError } from '@/utils/alert';
import type { NewSaleItem, SaleStatus, Client, Product } from '@/types';

export default function NewSaleScreen() {
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: clients = [] } = useClients();
  const { data: products = [] } = useProducts();
  const createSale = useCreateSale();
  const createProduct = useCreateProduct();
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  React.useEffect(() => {
    if (clientId && clients.length > 0 && !selectedClient) {
      const found = clients.find((c) => c.id === clientId);
      if (found) setSelectedClient(found);
    }
  }, [clientId, clients]);
  const [items, setItems] = useState<NewSaleItem[]>([]);
  const [createdAt, setCreatedAt] = useState(getTodayDate());
  const [paidAmount, setPaidAmount] = useState('');
  const [installments, setInstallments] = useState<number>(1);
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [status, setStatus] = useState<SaleStatus>('pendente');

  // Modal states
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Inline item being added
  const [editingItem, setEditingItem] = useState<{
    product_id?: string | null;
    product_name: string;
    unit_price: string;
    quantity: string;
  } | null>(null);

  const totalAmount = items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  const parsedPaid = parseCurrency(paidAmount);
  const dueAmount = Math.max(0, totalAmount - parsedPaid);
  const autoStatus: SaleStatus = parsedPaid >= totalAmount && totalAmount > 0
    ? 'pago'
    : parsedPaid > 0
    ? 'parcial'
    : 'pendente';

  function addItem() {
    setEditingItem({ product_name: '', unit_price: '', quantity: '1' });
  }

  function selectProduct(product: Product) {
    setEditingItem({
      product_id: product.id,
      product_name: product.name,
      unit_price: maskCurrency(Math.round(product.default_price * 100).toString()),
      quantity: '1',
    });
    setShowProductModal(false);
  }

  async function confirmItem() {
    if (!editingItem) return;
    const trimmedName = editingItem.product_name.trim();
    if (!trimmedName) {
      showAlert('Atenção', 'Informe o nome do produto.', 'warning');
      return;
    }
    const price = parseCurrency(editingItem.unit_price);
    const qty = parseInt(editingItem.quantity, 10);
    if (isNaN(price) || price <= 0) {
      showAlert('Atenção', 'Informe um preço unitário válido.', 'warning');
      return;
    }
    if (isNaN(qty) || qty < 1) {
      showAlert('Atenção', 'Quantidade deve ser ao menos 1.', 'warning');
      return;
    }

    let productId = editingItem.product_id ?? null;

    if (!productId) {
      const existing = products.find(
        (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (existing) {
        productId = existing.id;
      } else {
        try {
          setIsSavingProduct(true);
          const newProd = await createProduct.mutateAsync({
            name: trimmedName,
            default_price: price,
          });
          if (newProd?.id) {
            productId = newProd.id;
          }
        } catch (e: any) {
          console.error('Erro ao salvar novo produto em produtos:', e);
        } finally {
          setIsSavingProduct(false);
        }
      }
    }

    setItems((prev) => [
      ...prev,
      {
        product_id: productId,
        product_name: trimmedName,
        unit_price: price,
        quantity: qty,
      },
    ]);
    setEditingItem(null);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!selectedClient) {
      showAlert('Atenção', 'Selecione um cliente.', 'warning');
      return;
    }
    if (items.length === 0) {
      showAlert('Atenção', 'Adicione ao menos um item à venda.', 'warning');
      return;
    }
    if (totalAmount <= 0) {
      showAlert('Atenção', 'O valor total deve ser maior que zero.', 'warning');
      return;
    }

    try {
      const saleDateObj = createdAt.trim() ? new Date(createdAt.trim() + 'T12:00:00') : new Date();
      await createSale.mutateAsync({
        client_id: selectedClient.id,
        total_amount: totalAmount,
        paid_amount: parsedPaid,
        due_amount: dueAmount,
        due_date: dueDate.trim() || null,
        installments,
        created_at: saleDateObj.toISOString(),
        status: autoStatus,
        items,
      });
      router.back();
    } catch (e: any) {
      showError('Erro', e.message ?? 'Não foi possível criar a venda.');
    }
  }

  const filteredClients = clientSearch
    ? clients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients;

  const filteredProducts = productSearch
    ? products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header title="Nova Venda" showBack />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Client selector */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
              CLIENTE *
            </Text>
            <TouchableOpacity
              style={[styles.selector, { borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary }]}
              onPress={() => setShowClientModal(true)}
            >
              {selectedClient ? (
                <View style={styles.selectedRow}>
                  <View style={[styles.selectorAvatar, { backgroundColor: colors.primaryLight }]}>
                    <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
                      {selectedClient.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.medium, flex: 1 }}>
                    {selectedClient.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </View>
              ) : (
                <View style={styles.selectedRow}>
                  <Ionicons name="person-add-outline" size={20} color={colors.textTertiary} />
                  <Text style={{ color: colors.textTertiary, fontSize: fontSize.base, marginLeft: 10 }}>
                    Selecionar cliente...
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
                </View>
              )}
            </TouchableOpacity>
          </Card>

          {/* Items */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
              ITENS DA VENDA *
            </Text>

            {items.map((item, idx) => (
              <View
                key={idx}
                style={[styles.itemRow, { borderTopColor: colors.border, borderTopWidth: idx === 0 ? 0 : 1 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.medium }} numberOfLines={1}>
                    {item.product_name}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                    {item.quantity}x · {formatCurrency(item.unit_price)} = {formatCurrency(item.unit_price * item.quantity)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeItem(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Inline item editor */}
            {editingItem && (
              <View style={[styles.itemEditor, { borderColor: colors.primary, borderRadius: radius.md, backgroundColor: colors.primaryLight }]}>
                <TouchableOpacity
                  style={[styles.selectProductBtn, { borderColor: colors.primary, borderRadius: radius.sm }]}
                  onPress={() => setShowProductModal(true)}
                >
                  <Ionicons name="cube-outline" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: fontSize.sm, marginLeft: 6 }}>
                    {editingItem.product_id ? 'Produto selecionado ✓' : 'Selecionar produto existente'}
                  </Text>
                </TouchableOpacity>

                <Input
                  label="Nome do produto"
                  value={editingItem.product_name}
                  onChangeText={(v) => setEditingItem((e) => e ? { ...e, product_name: v, product_id: null } : e)}
                  placeholder="Nome do produto ou serviço"
                  containerStyle={{ marginTop: 8, marginBottom: 0 }}
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Preço unit. (R$)"
                      value={editingItem.unit_price}
                      onChangeText={(v) => setEditingItem((e) => e ? { ...e, unit_price: maskCurrency(v) } : e)}
                      placeholder="0,00"
                      keyboardType="numeric"
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                  <View style={{ width: 90 }}>
                    <Input
                      label="Qtd."
                      value={editingItem.quantity}
                      onChangeText={(v) => setEditingItem((e) => e ? { ...e, quantity: v } : e)}
                      placeholder="1"
                      keyboardType="numeric"
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <Button label="Confirmar" onPress={confirmItem} size="sm" style={{ flex: 1 }} loading={isSavingProduct} />
                  <Button label="Cancelar" variant="outline" onPress={() => setEditingItem(null)} size="sm" style={{ flex: 1 }} />
                </View>
              </View>
            )}

            {!editingItem && (
              <TouchableOpacity
                style={[styles.addItemBtn, { borderColor: colors.primary, borderRadius: radius.md }]}
                onPress={addItem}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: fontSize.base, fontWeight: fontWeight.medium, marginLeft: 8 }}>
                  Adicionar item
                </Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* Payment */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: fontSize.xs, marginBottom: 12 }]}>
              PAGAMENTO E PARCELAMENTO
            </Text>

            {/* Total display */}
            <View style={[styles.totalRow, { backgroundColor: colors.primaryLight, borderRadius: radius.md }]}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Total da venda</Text>
              <Text style={{ color: colors.primary, fontSize: fontSize.xl, fontWeight: fontWeight.bold }}>
                {formatCurrency(totalAmount)}
              </Text>
            </View>

            {/* Installments selector (1x a 6x sem juros) */}
            <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: 8 }}>
              Opções de Parcelamento (sem juros)
            </Text>
            <View style={styles.installmentsGrid}>
              {[1, 2, 3, 4, 5, 6].map((num) => {
                const isSelected = installments === num;
                return (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.installmentChip,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primaryLight : colors.surfaceSecondary,
                        borderRadius: radius.md,
                      },
                    ]}
                    onPress={() => {
                      setInstallments(num);
                      setDueDate(getInstallmentDueDates(num)[0]);
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? colors.primary : colors.text,
                        fontSize: fontSize.sm,
                        fontWeight: isSelected ? fontWeight.bold : fontWeight.medium,
                        textAlign: 'center',
                      }}
                    >
                      {num === 1 ? 'À vista' : `${num}x`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Breakdown of installments */}
            {totalAmount > 0 && installments > 1 && (
              <View style={[styles.installmentsBreakdown, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderColor: colors.border }]}>
                <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 6 }}>
                  {installments}x de {formatCurrency(totalAmount / installments)} sem juros
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginBottom: 8 }}>
                  Vencimentos:
                </Text>
                {calculateInstallmentsDetail(
                  totalAmount,
                  parsedPaid,
                  installments,
                  new Date(createdAt + (createdAt.length === 10 ? 'T12:00:00' : ''))
                ).map((inst) => {
                  const isPaid = inst.status === 'pago';
                  const isPartial = inst.status === 'parcial';
                  const color = isPaid ? colors.success : isPartial ? colors.primary : colors.textTertiary;
                  const statusLabel = isPaid ? 'Pago ✓' : isPartial ? `Parcial (${inst.percentage.toFixed(0)}%)` : 'Pendente';

                  return (
                    <View key={inst.number} style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>
                          Parcela {inst.number}/{installments} ({formatCurrency(inst.total)})
                        </Text>
                        <Text style={{ color: color, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>
                          {statusLabel} · {formatDate(inst.dueDate)}
                        </Text>
                      </View>
                      {isPartial && (
                        <Text style={{ color: colors.error, fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: 2 }}>
                          Falta: {formatCurrency(inst.remaining)}
                        </Text>
                      )}
                      <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                        <View
                          style={{
                            height: '100%',
                            width: `${inst.percentage}%`,
                            backgroundColor: isPaid ? colors.success : isPartial ? colors.primary : colors.textTertiary,
                            borderRadius: 3,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <DatePicker
              label="Data da venda"
              value={createdAt}
              onChange={(v) => {
                setCreatedAt(v);
                const refDate = new Date(v + (v.length === 10 ? 'T12:00:00' : ''));
                if (!isNaN(refDate.getTime())) {
                  setDueDate(getDefaultDueDate(refDate));
                }
              }}
            />

            <Input
              label="Valor pago no momento (R$)"
              value={paidAmount}
              onChangeText={(v) => setPaidAmount(maskCurrency(v))}
              placeholder="0,00"
              keyboardType="numeric"
              leftIcon={<Ionicons name="cash-outline" size={18} color={colors.textTertiary} />}
            />

            <DatePicker
              label="Data de vencimento (primeira parcela)"
              value={dueDate}
              onChange={setDueDate}
              suggestDayFive
            />

            {totalAmount > 0 && (
              <View style={[styles.statusPreview, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md }]}>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Status automático:</Text>
                <Badge status={autoStatus} />
                {dueAmount > 0 && (
                  <Text style={{ color: colors.error, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: 4 }}>
                    Restante a receber: {formatCurrency(dueAmount)}
                  </Text>
                )}
              </View>
            )}
          </Card>

          <Button
            label="Registrar Venda"
            onPress={handleSave}
            loading={createSale.isPending}
            fullWidth
            size="lg"
          />
          <Button label="Cancelar" variant="ghost" onPress={() => router.back()} fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Client picker modal */}
      <Modal visible={showClientModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.surface, paddingTop: Math.max(insets.top + 16, 24) }]}>
          <View style={styles.modalHeader}>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>
              Selecionar Cliente
            </Text>
            <TouchableOpacity onPress={() => setShowClientModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.modalSearch, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border, borderRadius: radius.md }]}
            placeholder="Buscar..."
            placeholderTextColor={colors.textTertiary}
            value={clientSearch}
            onChangeText={setClientSearch}
          />
          <FlatList
            data={filteredClients}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                onPress={() => { setSelectedClient(item); setShowClientModal(false); setClientSearch(''); }}
              >
                <Text style={{ color: colors.text, fontSize: fontSize.base }}>{item.name}</Text>
                {item.phone && <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{item.phone}</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Product picker modal */}
      <Modal visible={showProductModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.surface, paddingTop: Math.max(insets.top + 16, 24) }]}>
          <View style={styles.modalHeader}>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>
              Selecionar Produto
            </Text>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.modalSearch, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border, borderRadius: radius.md }]}
            placeholder="Buscar produto..."
            placeholderTextColor={colors.textTertiary}
            value={productSearch}
            onChangeText={setProductSearch}
          />
          <FlatList
            data={filteredProducts}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                onPress={() => selectProduct(item)}
              >
                <Text style={{ color: colors.text, fontSize: fontSize.base }}>{item.name}</Text>
                <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                  {formatCurrency(item.default_price)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12 },
  section: { marginBottom: 0 },
  sectionTitle: { letterSpacing: 0.8, marginBottom: 10 },
  selector: { borderWidth: 1.5, padding: 12 },
  selectedRow: { flexDirection: 'row', alignItems: 'center' },
  selectorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  itemEditor: { borderWidth: 1.5, padding: 12, marginTop: 8 },
  selectProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 14,
    marginTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 14,
  },
  installmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    marginBottom: 14,
  },
  installmentChip: {
    width: '31.5%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  installmentsBreakdown: {
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  installmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  statusPreview: {
    padding: 12,
    gap: 4,
  },
  modal: { flex: 1, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalSearch: { borderWidth: 1, padding: 12, marginBottom: 12, fontSize: 15 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1 },
});