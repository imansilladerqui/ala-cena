import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useConfirmScan } from '@/src/api/hooks/usePantry';
import { clearPendingScanItems, getPendingScanItems } from '@/src/store/scanStore';
import type { ScannedItem } from '@/src/types/api';

export default function ScanConfirmScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const confirmScan = useConfirmScan();

  const [items, setItems] = useState<ScannedItem[]>(() => getPendingScanItems());

  const updateItem = (index: number, field: keyof ScannedItem, value: string) => {
    setItems(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === 'quantity') return { ...item, quantity: parseFloat(value) || 1 };
        if (field === 'unit') return { ...item, unit: value || null };
        return { ...item, name: value };
      })
    );
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const confirm = async () => {
    if (!items.length) return Alert.alert('Error', 'Añade al menos un producto');
    try {
      await confirmScan.mutateAsync(items);
      clearPendingScanItems();
      Alert.alert('Listo', 'Productos añadidos a la alacena', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/pantry') },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo confirmar');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Revisa los productos detectados
        </Text>
        <Text style={[styles.sub, { color: colors.muted }]}>
          Edita cantidades o elimina falsos positivos antes de confirmar.
        </Text>

        {items.length === 0 && (
          <Text style={[styles.empty, { color: colors.muted }]}>No hay productos. Vuelve a escanear.</Text>
        )}

        {items.map((item, index) => (
          <View key={index} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.label, { color: colors.muted }]}>Producto {index + 1}</Text>
              <Pressable onPress={() => removeItem(index)}>
                <Text style={{ color: '#c44', fontSize: 20 }}>×</Text>
              </Pressable>
            </View>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={item.name}
              onChangeText={v => updateItem(index, 'name', v)}
              placeholder="Nombre"
              placeholderTextColor={colors.muted}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.half, { color: colors.text, borderColor: colors.border }]}
                value={String(item.quantity)}
                onChangeText={v => updateItem(index, 'quantity', v)}
                keyboardType="decimal-pad"
                placeholder="Cant."
                placeholderTextColor={colors.muted}
              />
              <TextInput
                style={[styles.input, styles.half, { color: colors.text, borderColor: colors.border }]}
                value={item.unit ?? ''}
                onChangeText={v => updateItem(index, 'unit', v)}
                placeholder="Unidad"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.btn, { backgroundColor: colors.tint }]}
          onPress={confirm}
          disabled={confirmScan.isPending}>
          <Text style={styles.btnText}>
            {confirmScan.isPending ? 'Guardando...' : `Confirmar (${items.length})`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 100 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  sub: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  empty: { textAlign: 'center', marginTop: 40 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  footer: { position: 'absolute', bottom: 24, left: 16, right: 16 },
  btn: { padding: 16, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
