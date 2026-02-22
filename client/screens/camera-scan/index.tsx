import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';

/**
 * 拍照识别页面 - 暂未开放
 * 
 * TODO: 以后需要实现时，请参考以下步骤：
 * 1. 恢复相机权限检查逻辑（useCameraPermissions）
 * 2. 恢复相机视图组件（CameraView）
 * 3. 恢复拍照和图像处理逻辑
 * 4. 恢复 OCR 识别逻辑
 * 5. 恢复结果展示界面
 * 
 * 技术栈：
 * - expo-camera: 相机功能
 * - expo-image-manipulator: 图像裁剪
 * - 后端 OCR API: 文字识别
 */
export default function CameraScanScreen() {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);
  const router = useSafeRouter();

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* 顶部导航栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={theme.textPrimary}>拍照识别</ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* 内容区域 */}
        <View style={styles.content}>
          {/* 占位图标 */}
          <View style={styles.iconContainer}>
            <FontAwesome6 name="camera" size={80} color={theme.textMuted} />
          </View>

          {/* 提示信息 */}
          <ThemedText variant="h2" color={theme.textPrimary} style={styles.title}>
            功能暂未开放
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.description}>
            拍照识别功能正在开发中，敬请期待...
          </ThemedText>
        </View>
      </View>
    </Screen>
  );
}
