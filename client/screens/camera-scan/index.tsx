import React, { useState, useMemo, useRef } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { createStyles } from './styles';
import { createFormDataFile } from '@/utils';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '';

export default function CameraScanScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef<any>(null);
  const scanBoxRef = useRef<View>(null);
  const [scanBoxLayout, setScanBoxLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

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

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  return (
    <Screen backgroundColor="#000" statusBarStyle="light">
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          {/* 扫描框 */}
          <View
            ref={scanBoxRef}
            style={styles.scanBox}
            onLayout={(event) => {
              const { x, y, width, height } = event.nativeEvent.layout;
              setScanBoxLayout({ x, y, width, height });
            }}
          >
            <View style={styles.scanCorner} />
            <View style={[styles.scanCorner, styles.topRight]} />
            <View style={[styles.scanCorner, styles.bottomLeft]} />
            <View style={[styles.scanCorner, styles.bottomRight]} />
          </View>

          {/* 提示 */}
          <ThemedView level="tertiary" style={styles.hintContainer}>
            <ThemedText variant="body" color="#fff">
              将单个英文单词放入框内，确保清晰可见
            </ThemedText>
          </ThemedView>

          {/* 切换摄像头按钮 */}
          <TouchableOpacity
            style={styles.flipButton}
            onPress={toggleCameraFacing}
          >
            <FontAwesome6 name="camera-rotate" size={24} color="#fff" />
          </TouchableOpacity>

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
    if (!cameraRef.current) {
      Alert.alert('错误', '相机未初始化');
      return;
    }

    if (scanBoxLayout.width === 0 || scanBoxLayout.height === 0) {
      Alert.alert('错误', '扫描框未初始化，请稍后重试');
      return;
    }

    setScanning(true);

    try {
      // 拍照
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false
      });

      if (!photo || !photo.uri) {
        throw new Error('拍照失败');
      }

      console.log('[Camera] 拍照成功:', photo.uri);
      console.log('[Camera] 扫描框位置:', scanBoxLayout);
      console.log('[Camera] 图片尺寸:', photo.width, 'x', photo.height);

      // 获取屏幕尺寸
      const screenWidth = photo.width;
      const screenHeight = photo.height;

      // 计算裁剪区域（注意：相机的坐标系与屏幕坐标系可能不同）
      // 扫描框在屏幕上的百分比位置
      const cropX = Math.floor(scanBoxLayout.x / (screenWidth / screenWidth) * photo.width);
      const cropY = Math.floor(scanBoxLayout.y / (screenHeight / screenHeight) * photo.height);
      const cropWidth = Math.floor(scanBoxLayout.width / (screenWidth / screenWidth) * photo.width);
      const cropHeight = Math.floor(scanBoxLayout.height / (screenHeight / screenHeight) * photo.height);

      console.log('[Camera] 裁剪区域:', { cropX, cropY, cropWidth, cropHeight });

      // 裁剪图片到扫描框区域
      const croppedImage = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          {
            crop: {
              originX: cropX,
              originY: cropY,
              width: cropWidth,
              height: cropHeight,
            },
          },
        ],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false,
        }
      );

      console.log('[Camera] 裁剪成功:', croppedImage.uri);

      // 上传图片到后端进行 OCR 识别
      /**
       * 服务端文件：server/src/routes/ocr.ts
       * 接口：POST /api/v1/ocr/recognize
       * Body (multipart/form-data):
       *   - file: File (图片文件)
       * Response:
       *   {
       *     success: true,
       *     word: "识别到的英文单词",
       *     phonetic: "音标",
       *     partOfSpeech: "词性",
       *     definition: "释义"
       *   }
       */
      const formData = new FormData();

      // 使用 createFormDataFile 创建跨平台兼容的文件对象
      const file = await createFormDataFile(croppedImage.uri, 'photo.jpg', 'image/jpeg');
      formData.append('file', file as any);

      console.log('[Camera] 开始识别...');

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ocr/recognize`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      console.log('[Camera] 识别结果:', result);

      if (!result.success) {
        throw new Error(result.error || '识别失败');
      }

      const recognizedWord = result.word?.trim() || '';
      const phonetic = result.phonetic || '';
      const partOfSpeech = result.partOfSpeech || '';
      const definition = result.definition || '';

      if (!recognizedWord) {
        Alert.alert(
          '识别失败',
          '未能识别到有效的英文单词，请确保图片清晰且包含完整的单词卡片信息',
          [
            { text: '重拍', onPress: () => setScanning(false) },
            { text: '取消', onPress: () => setScanning(false) }
          ]
        );
        return;
      }

      // 显示识别结果
      const resultText = `单词：${recognizedWord}\n${phonetic ? `音标：${phonetic}\n` : ''}${partOfSpeech ? `词性：${partOfSpeech}\n` : ''}${definition ? `释义：${definition}` : ''}`;

      Alert.alert(
        '识别结果',
        resultText,
        [
          { text: '重拍', onPress: () => setScanning(false) },
          {
            text: '确认',
            onPress: () => {
              router.push('/add-word', {
                word: recognizedWord,
                phonetic,
                partOfSpeech,
                definition
              });
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('[Camera] 识别错误:', error);
      Alert.alert(
        '识别失败',
        error.message || '识别过程中出现错误，请重试',
        [
          { text: '重拍', onPress: () => setScanning(false) },
          { text: '取消', onPress: () => setScanning(false) }
        ]
      );
    } finally {
      setScanning(false);
    }
  }
}
