import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useProduct, useCreateProduct, useUpdateProduct, uploadProductPhoto } from '@/hooks/useProducts';
import { useTheme } from '@/hooks/useTheme';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id && id !== 'new';
  const { colors, radius, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: existing, isLoading: loadingExisting } = useProduct(id ?? '');
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setPrice(existing.default_price.toString());
      setPhotoUrl(existing.photo_url ?? null);
    }
  }, [existing]);

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria de fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      // Comprimir e redimensionar a imagem antes do upload
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
      setPhotoUri(compressed.uri);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Atenção', 'O nome do produto é obrigatório.');
      return;
    }
    const parsedPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Atenção', 'Informe um preço válido.');
      return;
    }

    try {
      let finalPhotoUrl = photoUrl;

      // Upload da nova foto se selecionada
      if (photoUri) {
        setUploadingPhoto(true);
        const tempId = isEditing ? id! : `temp-${Date.now()}`;
        finalPhotoUrl = await uploadProductPhoto(photoUri, tempId);
        setUploadingPhoto(false);
      }

      if (isEditing && id) {
        await updateProduct.mutateAsync({
          id,
          name: name.trim(),
          default_price: parsedPrice,
          photo_url: finalPhotoUrl,
        });
      } else {
        await createProduct.mutateAsync({
          name: name.trim(),
          default_price: parsedPrice,
          photo_url: finalPhotoUrl,
        });
      }
      router.back();
    } catch (e: any) {
      setUploadingPhoto(false);
      Alert.alert('Erro', e.message ?? 'Não foi possível salvar o produto.');
    }
  }

  if (isEditing && loadingExisting) return <LoadingSpinner fullScreen />;

  const isSaving = createProduct.isPending || updateProduct.isPending || uploadingPhoto;
  const displayPhoto = photoUri ?? photoUrl;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header title={isEditing ? 'Editar Produto' : 'Novo Produto'} showBack />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo picker */}
          <TouchableOpacity style={styles.photoPicker} onPress={handlePickImage} activeOpacity={0.8}>
            {displayPhoto ? (
              <Image source={{ uri: displayPhoto }} style={[styles.photoPreview, { borderRadius: radius.lg }]} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: colors.primaryLight, borderRadius: radius.lg, borderColor: colors.border }]}>
                <Ionicons name="camera-outline" size={32} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginTop: 8 }}>
                  Adicionar Foto
                </Text>
              </View>
            )}
            {displayPhoto && (
              <View style={[styles.photoEditBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, textAlign: 'center', marginBottom: 24 }}>
            A foto será comprimida automaticamente
          </Text>

          <Input
            label="Nome do Produto *"
            value={name}
            onChangeText={setName}
            placeholder="Ex: Camisa Polo Branca"
            autoCapitalize="words"
            leftIcon={<Ionicons name="cube-outline" size={18} color={colors.textTertiary} />}
          />

          <Input
            label="Preço Padrão (R$) *"
            value={price}
            onChangeText={setPrice}
            placeholder="0,00"
            keyboardType="decimal-pad"
            leftIcon={<Ionicons name="cash-outline" size={18} color={colors.textTertiary} />}
            hint="Este valor pode ser alterado individualmente em cada venda."
          />

          <Button
            label={isSaving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Produto'}
            onPress={handleSave}
            loading={isSaving}
            fullWidth
            size="lg"
            style={{ marginTop: 8 }}
          />

          <Button label="Cancelar" variant="ghost" onPress={() => router.back()} fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 20 },
  photoPicker: { alignSelf: 'center', marginBottom: 8, position: 'relative' },
  photoPreview: { width: 120, height: 120 },
  photoPlaceholder: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});