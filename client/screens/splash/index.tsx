import React, { useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, Text, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

// 完整的文本内容
const LEARNING_TRUTH_TEXT = `学习者必须面对的一个真相
有效的学习，即便是背单词这件事，也必须是输出式的，这是唯一高效的学习方式！
什么是输出式学习？经过自己脑中已有的知识对新知识二次加工，强化其与旧知识链接强度的过程。
这也意味着：背单词没有任何捷径可走。想要产生哪怕一点点效果，都必须完成这个过程。这不是我个人的观点，而是记忆原理、认知心理学，以及无数真正学会的人共同验证的结论。
别再指望靠 "混个脸熟" 就能记住单词：只看不拼、只翻卡片不主动回忆、反复浏览却从不提取……这些都只是用战术上的勤奋，掩盖战略上的懒惰。
你可能早已隐约感觉到：自己很努力，却没什么效果。只是你害怕面对那个真正的问题 ——主动思考带来的大脑不适感。
对于背单词，最高效的方法就是主动回忆，而且是在单词快忘记的时候努力去回忆！因为记忆提取的难度越高记忆的存储效果越好！
所以适当的连接方式和复习间隔是必要的，它能你促进你对单词进行二次加工、重构（用自己的方式），从而达到真正记住的目的！
这款软件未必能保证你达到多高的水平，但希望上述这些对单词记忆原理的描述，能够对你有所启发！`;

// 简短版本（用于标签显示）
const LEARNING_TRUTH_SHORT = '学习者必须面对的一个真相';

export default function SplashScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  
  const [canClose, setCanClose] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showFullText, setShowFullText] = useState(false);

  // 倒计时逻辑
  useEffect(() => {
    const timer = setTimeout(() => {
      setCountdown(0);
      setCanClose(true);
    }, 3000);

    // 更新倒计时显示
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleClose = () => {
    if (canClose) {
      router.back();
    }
  };

  const toggleFullText = () => {
    setShowFullText(!showFullText);
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* 顶部标题区域 */}
        <View style={styles.headerSection}>
          <View style={styles.iconContainer}>
            <FontAwesome6 name="brain" size={48} color={theme.primary} />
          </View>
          <ThemedText variant="h1" color={theme.textPrimary} style={styles.appTitle}>
            编码记忆法
          </ThemedText>
          <ThemedText variant="body" color={theme.textMuted} style={styles.appVersion}>
            版本 1.0.0
          </ThemedText>
        </View>

        {/* 学习真相标签 */}
        <TouchableOpacity
          style={styles.truthTag}
          onPress={toggleFullText}
          activeOpacity={0.7}
        >
          <View style={[styles.tagIconContainer, { backgroundColor: theme.primary + '20' }]}>
            <FontAwesome6 name="lightbulb" size={20} color={theme.primary} />
          </View>
          <ThemedText variant="body" color={theme.textPrimary} style={styles.tagText}>
            {LEARNING_TRUTH_SHORT}
          </ThemedText>
          <FontAwesome6 
            name={showFullText ? "chevron-up" : "chevron-down"} 
            size={16} 
            color={theme.textMuted} 
          />
        </TouchableOpacity>

        {/* 完整文本内容 */}
        {showFullText && (
          <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
            <ThemedView level="tertiary" style={styles.fullTextContainer}>
              <Text style={styles.fullText}>
                {LEARNING_TRUTH_TEXT}
              </Text>
            </ThemedView>
          </Animated.View>
        )}

        {/* 关闭按钮 */}
        <TouchableOpacity
          style={[
            styles.closeButton,
            { 
              backgroundColor: canClose ? theme.primary : theme.textMuted,
              opacity: canClose ? 1 : 0.5
            }
          ]}
          onPress={handleClose}
          disabled={!canClose}
          activeOpacity={canClose ? 0.7 : 1}
        >
          {canClose ? (
            <>
              <FontAwesome6 name="xmark" size={20} color={theme.buttonPrimaryText} />
              <ThemedText variant="body" color={theme.buttonPrimaryText} style={styles.closeButtonText}>
                关闭
              </ThemedText>
            </>
          ) : (
            <>
              <ActivityIndicator size={20} color={theme.backgroundRoot} />
              <ThemedText variant="body" color={theme.backgroundRoot} style={styles.closeButtonText}>
                请稍候 {countdown}s
              </ThemedText>
            </>
          )}
        </TouchableOpacity>

        {/* 提示文本 */}
        {!canClose && (
          <ThemedText variant="caption" color={theme.textMuted} style={styles.hintText}>
            请阅读完学习真相后关闭
          </ThemedText>
        )}
      </ScrollView>
    </Screen>
  );
}
