import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { createStyles } from './styles';

export default function CameraScanScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  if (!permission) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.permissionContainer}>
          <FontAwesome6 name="camera" size={64} color={theme.textMuted} style={styles.permissionIcon} />
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.permissionTitle}>
            需要相机权限
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.permissionText}>
            需要访问相机以拍摄文字
          </ThemedText>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <ThemedText variant="body" color={theme.buttonPrimaryText}>
              授予权限
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <ThemedText variant="body" color={theme.textMuted}>
              取消
            </ThemedText>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="#000" statusBarStyle="light">
      <View style={styles.container}>
        <CameraView style={styles.camera} facing="back">
          {/* 扫描框 */}
          <View style={styles.scanBox}>
            <View style={styles.scanCorner} />
            <View style={[styles.scanCorner, styles.topRight]} />
            <View style={[styles.scanCorner, styles.bottomLeft]} />
            <View style={[styles.scanCorner, styles.bottomRight]} />
          </View>

          {/* 提示 */}
          <ThemedView level="tertiary" style={styles.hintContainer}>
            <ThemedText variant="body" color="#fff">
              将英文单词放入框内
            </ThemedText>
          </ThemedView>

          {/* 拍照按钮 */}
          <TouchableOpacity 
            style={styles.captureButton}
            onPress={handleCapture}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          {/* 取消按钮 */}
          <TouchableOpacity 
            style={styles.cancelButtonTop}
            onPress={() => router.back()}
          >
            <FontAwesome6 name="xmark" size={32} color="#fff" />
          </TouchableOpacity>
        </CameraView>

        {scanning && (
          <View style={styles.scanningOverlay}>
            <ActivityIndicator color={theme.primary} size="large" />
            <ThemedText variant="body" color="#fff" style={styles.scanningText}>
              识别中...
            </ThemedText>
          </View>
        )}
      </View>
    </Screen>
  );

  async function handleCapture() {
    setScanning(true);
    
    // 模拟OCR识别（实际需要集成OCR API）
    setTimeout(() => {
      // 模拟识别结果
      const mockWord = 'example';
      Alert.alert(
        '识别结果',
        `识别到单词：${mockWord}`,
        [
          { text: '重拍', onPress: () => setScanning(false) },
          { 
            text: '确认', 
            onPress: () => {
              router.push('/add-word', { word: mockWord });
            }
          }
        ]
      );
    }, 1000);
  }
}
