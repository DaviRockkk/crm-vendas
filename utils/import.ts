import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase';

export interface ImportResult {
  canceled: boolean;
  counts?: {
    clients: number;
    products: number;
    sales: number;
    saleItems: number;
  };
}

export async function importBackupFromJSON(): Promise<ImportResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  const pickerResult = await DocumentPicker.getDocumentAsync({
    type: ['application/json', '*/*'],
    copyToCacheDirectory: true,
  });

  if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
    return { canceled: true };
  }

  const selectedFile = pickerResult.assets[0];

  let fileContent: string;
  try {
    const response = await fetch(selectedFile.uri);
    fileContent = await response.text();
  } catch (err: any) {
    throw new Error(`Não foi possível ler o arquivo selecionado: ${err?.message || 'Erro desconhecido'}`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(fileContent);
  } catch {
    throw new Error('O arquivo selecionado não é um formato JSON válido.');
  }

  if (!parsed || typeof parsed !== 'object' || !parsed.data) {
    throw new Error('O arquivo selecionado não contém o formato de backup do CRM.');
  }

  const { clients = [], products = [], sales = [], sale_items = [] } = parsed.data;

  if (!Array.isArray(clients) || !Array.isArray(products) || !Array.isArray(sales)) {
    throw new Error('A estrutura interna do backup está corrompida ou inválida.');
  }

  // 1. Restaurar Clientes
  const clientsToUpsert = clients.map((c: any) => ({
    ...c,
    user_id: user.id,
  }));
  if (clientsToUpsert.length > 0) {
    const { error } = await supabase.from('clients').upsert(clientsToUpsert);
    if (error) throw new Error(`Erro ao restaurar clientes: ${error.message}`);
  }

  // 2. Restaurar Produtos
  const productsToUpsert = products.map((p: any) => ({
    ...p,
    user_id: user.id,
  }));
  if (productsToUpsert.length > 0) {
    const { error } = await supabase.from('products').upsert(productsToUpsert);
    if (error) throw new Error(`Erro ao restaurar produtos: ${error.message}`);
  }

  // 3. Restaurar Vendas
  const salesToUpsert = sales.map((s: any) => {
    // Remover propriedades de relacionamentos populados (ex: clients, sale_items) se existirem no JSON
    const { clients: _c, sale_items: _si, ...rest } = s;
    return {
      ...rest,
      user_id: user.id,
    };
  });
  if (salesToUpsert.length > 0) {
    const { error } = await supabase.from('sales').upsert(salesToUpsert);
    if (error) throw new Error(`Erro ao restaurar vendas: ${error.message}`);
  }

  // 4. Restaurar Itens das Vendas
  const saleItemsToUpsert = (Array.isArray(sale_items) ? sale_items : []).map((item: any) => {
    const { sales: _s, ...rest } = item;
    return rest;
  });
  if (saleItemsToUpsert.length > 0) {
    const { error } = await supabase.from('sale_items').upsert(saleItemsToUpsert);
    if (error) throw new Error(`Erro ao restaurar itens de vendas: ${error.message}`);
  }

  return {
    canceled: false,
    counts: {
      clients: clientsToUpsert.length,
      products: productsToUpsert.length,
      sales: salesToUpsert.length,
      saleItems: saleItemsToUpsert.length,
    },
  };
}
