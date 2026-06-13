import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useScanTicket } from '@/src/api/hooks/usePantry';
import { setPendingScanItems } from '@/src/store/scanStore';

export default function ScanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const scanTicket = useScanTicket();

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!photo?.base64) {
        Alert.alert('Error', 'No se pudo capturar la imagen');
        return;
      }
      const result = await scanTicket.mutateAsync(photo.base64);
      setPendingScanItems(result.detected);
      router.push('/scan-confirm');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al escanear');
    }
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text, marginBottom: 16 }]}>
          Necesitamos acceso a la cámara para escanear tickets
        </Text>
        <Pressable style={[styles.btn, { backgroundColor: colors.tint }]} onPress={requestPermission}>
          <Text style={styles.btnText}>Permitir cámara</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.controls}>
        <Pressable
          style={[styles.btn, { backgroundColor: colors.tint }]}
          onPress={takePhoto}
          disabled={scanTicket.isPending}>
          <Text style={styles.btnText}>
            {scanTicket.isPending ? 'Procesando...' : 'Capturar ticket'}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.cancel}>
          <Text style={{ color: '#fff' }}>Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  controls: { padding: 24, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  btn: { padding: 16, borderRadius: 14, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancel: { marginTop: 12, padding: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  text: { textAlign: 'center', lineHeight: 22 },
});
