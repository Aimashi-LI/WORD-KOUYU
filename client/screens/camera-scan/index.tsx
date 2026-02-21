import React, { useState, useMemo, useRef } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator, useWindowDimensions, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { createStyles } from './styles';
import { recognizeText } from '@/utils/ocr';

interface RecognizedWord {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition?: string;
}

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '';

export default function CameraScanScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [scanning, setScanning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recognizedWords, setRecognizedWords] = useState<RecognizedWord[]>([]);
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

  // 处理拍照和识别
  const handleCapture = async () => {
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

      let imageUri = photo.uri;

      // 尝试裁剪图片到扫描框区域
      try {
        // 计算屏幕和图片的比例
        const scaleX = photo.width / screenWidth;
        const scaleY = photo.height / screenHeight;

        // 计算裁剪区域
        const cropX = Math.floor(scanBoxLayout.x * scaleX);
        const cropY = Math.floor(scanBoxLayout.y * scaleY);
        const cropWidth = Math.floor(scanBoxLayout.width * scaleX);
        const cropHeight = Math.floor(scanBoxLayout.height * scaleY);

        // 确保裁剪区域在图片范围内
        const safeCropX = Math.max(0, cropX);
        const safeCropY = Math.max(0, cropY);
        const safeCropWidth = Math.min(cropWidth, photo.width - safeCropX);
        const safeCropHeight = Math.min(cropHeight, photo.height - safeCropY);

        console.log('[Camera] 计算比例:', { scaleX, scaleY });
        console.log('[Camera] 裁剪区域:', { safeCropX, safeCropY, safeCropWidth, safeCropHeight });

        // 检查是否可以进行裁剪
        if (safeCropWidth > 0 && safeCropHeight > 0) {
          const croppedImage = await ImageManipulator.manipulateAsync(
            photo.uri,
            [
              {
                crop: {
                  originX: safeCropX,
                  originY: safeCropY,
                  width: safeCropWidth,
                  height: safeCropHeight,
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
          imageUri = croppedImage.uri;
        } else {
          console.log('[Camera] 裁剪区域无效，使用原始图片');
        }
      } catch (cropError: any) {
        console.error('[Camera] 裁剪失败，使用原始图片:', cropError);
        // 裁剪失败时使用原始图片
        imageUri = photo.uri;
      }

      // 使用后端 OCR API 识别
      console.log('[Camera] 开始后端 OCR 识别...');

      const ocrResult = await recognizeText(imageUri);

      console.log('[Camera] OCR 识别结果:', ocrResult);

      if (!ocrResult.success) {
        throw new Error(ocrResult.error || 'OCR 识别失败');
      }

      // 从识别结果中提取单词
      const recognizedWords = ocrResult.words || [];

      if (recognizedWords.length === 0) {
        Alert.alert(
          '识别失败',
          '未能识别到有效的英文单词，请确保图片清晰且包含单词卡片',
          [
            { text: '重拍', onPress: () => setScanning(false) },
            { text: '取消', onPress: () => setScanning(false) }
          ]
        );
        return;
      }

      console.log('[Camera] 识别到', recognizedWords.length, '个单词');
      setRecognizedWords(recognizedWords);
      setShowResults(true);

    } catch (error: any) {
      console.error('[Camera] 识别错误:', error);

      let errorMessage = error.message || '识别过程中出现错误，请重试';

      // 针对本地 OCR 的特殊错误处理
      if (errorMessage.includes('ML Kit') || errorMessage.includes('module') || errorMessage.includes('模块')) {
        errorMessage = 'ML Kit OCR 模块未加载\n\n请确保已进行原生构建（EAS Build 或 Expo Dev Client）\n\n如果是 Expo Go，请使用真机测试或重新构建应用';
      } else if (errorMessage.includes('Web')) {
        errorMessage = 'Web 环境暂不支持本地 OCR\n\n请使用 Expo Go 或真机测试';
      } else if (errorMessage.includes('语言包')) {
        errorMessage = '语言包未下载\n\n请检查网络连接并重试';
      }

      Alert.alert(
        '识别失败',
        errorMessage,
        [
          { text: '重拍', onPress: () => setScanning(false) },
          { text: '取消', onPress: () => setScanning(false) }
        ]
      );
    } finally {
      setScanning(false);
    }
  };

  // 处理选择单词
  const handleSelectWord = (wordData: RecognizedWord) => {
    const resultText = `单词：${wordData.word}\n${wordData.phonetic ? `音标：${wordData.phonetic}\n` : ''}${wordData.partOfSpeech ? `词性：${wordData.partOfSpeech}\n` : ''}${wordData.definition ? `释义：${wordData.definition}` : ''}`;

    Alert.alert(
      '确认添加',
      resultText + '\n\n确定要添加这个单词吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => {
            router.push('/add-word', {
              word: wordData.word,
              phonetic: wordData.phonetic,
              partOfSpeech: wordData.partOfSpeech,
              definition: wordData.definition
            });
          }
        }
      ]
    );
  };

  return (
    <Screen backgroundColor="#000" statusBarStyle="light">
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          {/* 扫描框外的遮罩 */}
          <View style={styles.maskContainer}>
            {/* 上方遮罩 */}
            <View style={[styles.mask, styles.maskTop]} />
            {/* 下方遮罩 */}
            <View style={[styles.mask, styles.maskBottom]} />
            {/* 左侧遮罩 */}
            <View style={[styles.mask, styles.maskLeft]} />
            {/* 右侧遮罩 */}
            <View style={[styles.mask, styles.maskRight]} />
          </View>

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
              请将单词卡片放在扫描框内
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

      {/* 识别结果列表 */}
      {showResults && (
        <View style={styles.resultsOverlay}>
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <ThemedText variant="h3" color="#000" style={styles.resultsTitle}>
                识别结果 ({recognizedWords.length} 个单词)
              </ThemedText>
              <TouchableOpacity
                onPress={() => setShowResults(false)}
                style={styles.closeButton}
              >
                <FontAwesome6 name="xmark" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.resultsList}>
              {recognizedWords.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.wordItem}
                  onPress={() => handleSelectWord(item)}
                >
                  <View style={styles.wordItemHeader}>
                    <ThemedText variant="h4" color={theme.textPrimary}>
                      {item.word}
                    </ThemedText>
                    <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
                  </View>
                  {item.phonetic && (
                    <ThemedText variant="body" color={theme.textSecondary}>
                      {item.phonetic}
                    </ThemedText>
                  )}
                  {item.partOfSpeech && (
                    <ThemedText variant="caption" color={theme.textMuted}>
                      {item.partOfSpeech}
                    </ThemedText>
                  )}
                  {item.definition && (
                    <ThemedText variant="body" color={theme.textSecondary}>
                      {item.definition}
                    </ThemedText>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => {
                setShowResults(false);
              }}
            >
              <FontAwesome6 name="camera" size={14} color="#fff" />
              <ThemedText variant="caption" color="#fff">
                继续拍照
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Screen>
  );
}
