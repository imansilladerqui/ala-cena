import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import {
  useAddPantryItem,
  useClearPantry,
  useDeletePantryItem,
  usePantry,
  useUpdatePantryItem,
} from '@/src/api/hooks/usePantry';

export default function PantryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { data: items, isLoading, isError, error, refetch, isFetching } = usePantry();
  const addItem = useAddPantryItem();
  const updateItem = useUpdatePantryItem();
  const deleteItem = useDeletePantryItem();
  const clearPantry = useClearPantry();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert('Error', 'El nombre es obligatorio');
    try {
      await addItem.mutateAsync({
        name: name.trim(),
        quantity: parseFloat(quantity) || 1,
        unit: unit.trim() || undefined,
      });
      setShowAdd(false);
      setName('');
      setQuantity('1');
      setUnit('');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo añadir');
    }
  };

  const changeQty = async (id: number, current: number, delta: number) => {
    const newQty = Math.max(0, current + delta);
    try {
      await updateItem.mutateAsync({ id, quantity: newQty });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo actualizar');
    }
  };

  const handleClearPantry = () => {
    Alert.alert(
      'Vaciar alacena',
      '¿Eliminar todos los productos? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearPantry.mutateAsync();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo vaciar la alacena');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (id: number, itemName: string) => {
    Alert.alert('Eliminar', `¿Eliminar ${itemName}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteItem.mutateAsync(id);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, marginBottom: 16 }}>{error?.message}</Text>
        <Pressable style={[styles.btn, { backgroundColor: colors.tint }]} onPress={() => refetch()}>
          <Text style={styles.btnText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.tint} />}>
        {!!items?.length && (
          <Pressable
            style={[styles.clearBtn, { borderColor: colors.border }]}
            onPress={handleClearPantry}
            disabled={clearPantry.isPending}>
            <Text style={{ color: '#c44', fontWeight: '600' }}>
              {clearPantry.isPending ? 'Vaciando...' : 'Vaciar alacena'}
            </Text>
          </Pressable>
        )}
        {!items?.length && (
          <Text style={[styles.empty, { color: colors.muted }]}>
            La alacena está vacía. Añade productos manualmente o escanea un ticket.
          </Text>
        )}
        {items?.map(item => (
          <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Pressable onPress={() => handleDelete(item.id, item.name)}>
                <Text style={{ color: '#c44', fontSize: 18 }}>×</Text>
              </Pressable>
            </View>
            <View style={styles.qtyRow}>
              <Pressable style={styles.qtyBtn} onPress={() => changeQty(item.id, Number(item.quantity), -1)}>
                <Text style={{ fontSize: 20, color: colors.tint }}>−</Text>
              </Pressable>
              <Text style={[styles.qty, { color: colors.text }]}>
                {item.quantity} {item.unit ?? ''}
              </Text>
              <Pressable style={styles.qtyBtn} onPress={() => changeQty(item.id, Number(item.quantity), 1)}>
                <Text style={{ fontSize: 20, color: colors.tint }}>+</Text>
              </Pressable>
            </View>
            {item.expires_at && (
              <Text style={[styles.expires, { color: colors.muted }]}>Caduca: {item.expires_at}</Text>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.fabRow}>
        <Pressable style={[styles.fab, { backgroundColor: colors.tint }]} onPress={() => setShowAdd(true)}>
          <Text style={styles.btnText}>+ Añadir</Text>
        </Pressable>
        <Pressable style={[styles.fab, { backgroundColor: colors.success }]} onPress={() => router.push('/scan')}>
          <Text style={styles.btnText}>📷 Escanear</Text>
        </Pressable>
      </View>

      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nuevo producto</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Nombre"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Cantidad"
              placeholderTextColor={colors.muted}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Unidad (kg, L...)"
              placeholderTextColor={colors.muted}
              value={unit}
              onChangeText={setUnit}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowAdd(false)}>
                <Text style={{ color: colors.muted }}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.btn, { backgroundColor: colors.tint }]} onPress={handleAdd}>
                <Text style={styles.btnText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  list: { padding: 16, paddingBottom: 100 },
  clearBtn: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16, marginBottom: 12, borderWidth: 1, borderRadius: 10 },
  empty: { textAlign: 'center', marginTop: 40, lineHeight: 22 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 16 },
  qtyBtn: { padding: 8 },
  qty: { fontSize: 16, minWidth: 80, textAlign: 'center' },
  expires: { fontSize: 12, marginTop: 6 },
  fabRow: { position: 'absolute', bottom: 24, left: 16, right: 16, flexDirection: 'row', gap: 12 },
  fab: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center' },
  btn: { padding: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
});
