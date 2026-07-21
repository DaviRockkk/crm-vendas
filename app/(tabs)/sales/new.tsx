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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCreateSale } from '@/hooks/useSales';
import { useClients } from '@/hooks/useClients';
import { useProducts } from '@/hooks/useProducts';
import { useTheme } from '@/hooks/useTheme';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/format';
import type { NewSaleItem, SaleStatus, Client, Product } from '@/types';

export default function NewSaleScreen() {
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: clients = [] } = useClients();
  const { data: products = [] } = useProducts();
  const createSale = useCreateSale();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [items, setItems] = useState<NewSaleItem[]>([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
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
  const parsedPaid = parseFloat(paidAmount.replace(',', '.')) || 0;
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
      unit_price: product.default_price.toString(),
      quantity: '1',
    });
    setShowProductModal(false);
  }

  function confirmItem() {
    if (!editingItem) return;
    if (!editingItem.product_name.trim()) {
      Alert.alert('Atenção', 'Informe o nome do produto.');
      return;
    }
    const price = parseFloat(editingItem.unit_price.replace(',', '.'));
    const qty = parseInt(editingItem.quantity, 10);
    if (isNaN(price) || price < 0) {
      Alert.alert('Atenção', 'Informe um preço válido.');
      return;
    }
    if (isNaN(qty) || qty < 1) {
      Alert.alert('Atenção', 'Quantidade deve ser ao menos 1.');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        product_id: editingItem.product_id ?? null,
        product_name: editingItem.product_name.trim(),
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
      Alert.alert('Atenção', 'Selecione um cliente.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Atenção', 'Adicione ao menos um item à venda.');
      return;
    }
    if (totalAmount <= 0) {
      Alert.alert('Atenção', 'O valor total deve ser maior que zero.');
      return;
    }

    try {
      await createSale.mutateAsync({
        client_id: selectedClient.id,
        total_amount: totalAmount,
        paid_amount: parsedPaid,
        due_amount: dueAmount,
        due_date: dueDate.trim() || null,
        status: autoStatus,
        items,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível criar a venda.');
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
                      onChangeText={(v) => setEditingItem((e) => e ? { ...e, unit_price: v } : e)}
                      placeholder="0,00"
                      keyboardType="decimal-pad"
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
                  <Button label="Confirmar" onPress={confirmItem} size="sm" style={{ flex: 1 }} />
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
              PAGAMENTO
            </Text>

            {/* Total display */}
            <View style={[styles.totalRow, { backgroundColor: colors.primaryLight, borderRadius: radius.md }]}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Total da venda</Text>
              <Text style={{ color: colors.primary, fontSize: fontSize.xl, fontWeight: fontWeight.bold }}>
                {formatCurrency(totalAmount)}
              </Text>
            </View>

            <Input
              label="Valor pago (R$)"
              value={paidAmount}
              onChangeText={setPaidAmount}
              placeholder="0,00"
              keyboardType="decimal-pad"
              leftIcon={<Ionicons name="cash-outline" size={18} color={colors.textTertiary} />}
            />

            <Input
              label="Data de vencimento"
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="AAAA-MM-DD"
              leftIcon={<Ionicons name="calendar-outline" size={18} color={colors.textTertiary} />}
              hint="Ex: 2026-08-15"
            />

            {totalAmount > 0 && (
              <View style={[styles.statusPreview, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md }]}>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Status automático:</Text>
                <Badge status={autoStatus} />
                {dueAmount > 0 && (
                  <Text style={{ color: colors.error, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: 4 }}>
                    Restante: {formatCurrency(dueAmount)}
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
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
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
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
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
  statusPreview: {
    padding: 12,
    gap: 4,
  },
  modal: { flex: 1, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalSearch: { borderWidth: 1, padding: 12, marginBottom: 12, fontSize: 15 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1 },
});