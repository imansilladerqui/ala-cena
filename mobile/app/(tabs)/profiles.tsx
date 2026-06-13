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
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import {
  useCreateProfile,
  useDeleteProfile,
  useProfiles,
  useUpdateProfile,
} from '@/src/api/hooks/useProfiles';

export default function ProfilesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { data: profiles, isLoading, isError, error, refetch, isFetching } = useProfiles();
  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();
  const deleteProfile = useDeleteProfile();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [restrictionsText, setRestrictionsText] = useState('');

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setRestrictionsText('');
    setShowForm(true);
  };

  const openEdit = (id: number, profileName: string, restrictions: string[]) => {
    setEditingId(id);
    setName(profileName);
    setRestrictionsText(restrictions.join(', '));
    setShowForm(true);
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('Error', 'El nombre es obligatorio');
    const restrictions = restrictionsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    try {
      if (editingId) {
        await updateProfile.mutateAsync({ id: editingId, name: name.trim(), restrictions });
      } else {
        await createProfile.mutateAsync({ name: name.trim(), restrictions });
      }
      setShowForm(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    }
  };

  const handleDelete = (id: number, profileName: string) => {
    Alert.alert('Eliminar', `¿Eliminar a ${profileName}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProfile.mutateAsync(id);
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
        {!profiles?.length && (
          <Text style={[styles.empty, { color: colors.muted }]}>
            Añade los miembros de la familia y sus restricciones alimentarias.
          </Text>
        )}
        {profiles?.map(p => (
          <Pressable
            key={p.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => openEdit(p.id, p.name, p.restrictions)}>
            <View style={styles.cardTop}>
              <Text style={[styles.name, { color: colors.text }]}>{p.name}</Text>
              <Pressable onPress={() => handleDelete(p.id, p.name)}>
                <Text style={{ color: '#c44', fontSize: 18 }}>×</Text>
              </Pressable>
            </View>
            <View style={styles.chips}>
              {p.restrictions.length === 0 ? (
                <Text style={{ color: colors.muted, fontSize: 13 }}>Sin restricciones</Text>
              ) : (
                p.restrictions.map((r, i) => (
                  <View key={i} style={[styles.chip, { backgroundColor: colors.tint + '22' }]}>
                    <Text style={{ color: colors.tint, fontSize: 12 }}>{r}</Text>
                  </View>
                ))
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={[styles.fab, { backgroundColor: colors.tint }]} onPress={openCreate}>
        <Text style={styles.btnText}>+ Añadir persona</Text>
      </Pressable>

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingId ? 'Editar perfil' : 'Nueva persona'}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Nombre"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Restricciones (separadas por coma)"
              placeholderTextColor={colors.muted}
              value={restrictionsText}
              onChangeText={setRestrictionsText}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowForm(false)}>
                <Text style={{ color: colors.muted }}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.btn, { backgroundColor: colors.tint }]} onPress={save}>
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
  empty: { textAlign: 'center', marginTop: 40, lineHeight: 22 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  fab: { position: 'absolute', bottom: 24, left: 16, right: 16, padding: 16, borderRadius: 14, alignItems: 'center' },
  btn: { padding: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
});
