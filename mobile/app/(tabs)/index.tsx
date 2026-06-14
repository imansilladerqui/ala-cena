import { ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useChoosePreview, useChooseRecipe, useRateRecipe, useTodayMenu } from '@/src/api/hooks/useMenu';
import type { MenuProposal } from '@/src/types/api';

export default function TodayScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { data: proposals, isLoading, isError, error, refetch, isFetching } = useTodayMenu();
  const choosePreview = useChoosePreview();
  const chooseRecipe = useChooseRecipe();
  const rateRecipe = useRateRecipe();

  const [selected, setSelected] = useState<MenuProposal | null>(null);
  const [deductions, setDeductions] = useState<{ name: string; quantityToDeduct: number; unit: string | null }[]>([]);
  const [showChoose, setShowChoose] = useState(false);
  const [showRate, setShowRate] = useState(false);

  const handleChoose = async (recipe: MenuProposal) => {
    setSelected(recipe);
    try {
      const result = await choosePreview.mutateAsync(recipe.usedIngredients);
      setDeductions(result.deductions);
      setShowChoose(true);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo cargar el preview');
    }
  };

  const confirmChoose = async () => {
    if (!selected) return;
    try {
      await chooseRecipe.mutateAsync({
        recipeId: selected.id,
        recipeTitle: selected.title,
        ingredients: selected.usedIngredients.map(i => ({
          name: i.name,
          amount: i.amount,
          unit: i.unit,
        })),
      });
      setShowChoose(false);
      setShowRate(true);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo elegir la receta');
    }
  };

  const submitRating = async (rating: number) => {
    if (!selected) return;
    try {
      await rateRecipe.mutateAsync({ recipeId: selected.id, rating });
      setShowRate(false);
      setSelected(null);
      Alert.alert('¡Gracias!', 'Puntuación guardada');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar la puntuación');
    }
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
        <Text style={[styles.errorText, { color: colors.text }]}>{error?.message}</Text>
        <Pressable style={[styles.button, { backgroundColor: colors.tint }]} onPress={() => refetch()}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.tint} />}>
        <Text style={[styles.heading, { color: colors.text }]}>¿Qué cocinamos hoy?</Text>
        {!proposals?.length && (
          <Text style={[styles.empty, { color: colors.muted }]}>
            No hay recetas que puedas hacer solo con lo de la alacena (sin comprar nada más).
          </Text>
        )}
        {proposals?.map(recipe => (
          <View key={recipe.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {recipe.image ? (
              <Image source={{ uri: recipe.image }} style={styles.image} />
            ) : null}
            <View style={styles.cardBody}>
              <Text style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>
              <View style={[styles.badge, { backgroundColor: colors.success + '22' }]}>
                <Text style={[styles.badgeText, { color: colors.success }]}>
                  Solo con tu alacena · {recipe.usedIngredientCount} ingredientes
                </Text>
              </View>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>Ingredientes:</Text>
              {recipe.usedIngredients.slice(0, 6).map((ing, i) => (
                <Text key={i} style={[styles.ingredient, { color: colors.success }]}>✓ {ing.name}</Text>
              ))}
              <Pressable
                style={[styles.button, { backgroundColor: colors.tint }]}
                onPress={() => handleChoose(recipe)}
                disabled={choosePreview.isPending}>
                <Text style={styles.buttonText}>{choosePreview.isPending ? 'Cargando...' : 'Elegir'}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showChoose} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Se descontará de la alacena</Text>
            {deductions.length === 0 ? (
              <Text style={{ color: colors.muted }}>No se encontraron coincidencias en la alacena.</Text>
            ) : (
              deductions.map((d, i) => (
                <Text key={i} style={{ color: colors.text, marginBottom: 6 }}>
                  {d.name}: -{d.quantityToDeduct} {d.unit ?? ''}
                </Text>
              ))
            )}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowChoose(false)} style={styles.modalBtn}>
                <Text style={{ color: colors.muted }}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={confirmChoose} style={[styles.button, { backgroundColor: colors.tint, flex: 1 }]}>
                <Text style={styles.buttonText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showRate} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>¿Cómo estuvo?</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(n => (
                <Pressable key={n} onPress={() => submitRating(n)} style={styles.starBtn}>
                  <Text style={{ fontSize: 32 }}>★</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowRate(false)}>
              <Text style={{ color: colors.muted, textAlign: 'center' }}>Omitir</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  list: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  empty: { textAlign: 'center', marginTop: 40 },
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  image: { width: '100%', height: 160 },
  cardBody: { padding: 16 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  badgeText: { fontWeight: '600', fontSize: 13 },
  sectionLabel: { fontSize: 12, fontWeight: '600', marginTop: 6, marginBottom: 2 },
  ingredient: { fontSize: 14, marginLeft: 4 },
  button: { marginTop: 12, padding: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  errorText: { marginBottom: 16, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  modalBtn: { padding: 12 },
  stars: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 },
  starBtn: { alignItems: 'center' },
});
