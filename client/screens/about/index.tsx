import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

// 从 package.json 读取版本号
const APP_VERSION = '1.0.0';
const APP_NAME = '编码记忆法';
const DEVELOPER = '开发者';
const CONTACT_EMAIL = 'contact@example.com'; // 请替换为您的联系邮箱

// 法律文档链接（可以使用在线链接，或者直接在应用内展示）
const LEGAL_DOCS = {
  privacyPolicy: 'https://example.com/privacy', // 请替换为实际的在线文档链接
  termsOfService: 'https://example.com/terms',
  permissions: 'https://example.com/permissions',
};

export default function AboutScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const handleOpenLink = async (url: string, docName: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          '无法打开',
          `无法打开${docName}，请检查网络连接或链接是否正确。`
        );
      }
    } catch (error) {
      Alert.alert(
        '错误',
        `打开${docName}失败，请稍后重试。`
      );
    }
  };

  const showLegalDoc = (docName: string) => {
    setSelectedDoc(docName);
  };

  const getDocContent = (docName: string) => {
    // 这里返回文档的摘要内容
    // 实际使用时，可以从文档文件中读取完整内容
    switch (docName) {
      case '隐私政策':
        return '本应用完全离线运行，所有数据存储在本地，我们不会收集、存储或传输您的任何个人信息到云端服务器。\n\n详细信息请访问我们的在线文档。';
      case '用户协议':
        return '欢迎使用编码记忆法！本应用是一款基于艾宾浩斯记忆法和编码拆分技术的单词学习应用。\n\n详细信息请访问我们的在线文档。';
      case '应用权限说明':
        return '本应用仅使用必要的最小权限。仅在使用导出/导入功能时可能需要存储权限。\n\n详细信息请访问我们的在线文档。';
      default:
        return '';
    }
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 应用图标和名称 */}
        <View style={styles.header}>
          <FontAwesome6 name="brain" size={80} color={theme.primary} style={styles.icon} />
          <ThemedText variant="h1" color={theme.textPrimary} style={styles.appName}>
            {APP_NAME}
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted} style={styles.version}>
            版本 {APP_VERSION}
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.description}>
            基于编码记忆法的单词学习工具\n助你高效记忆英语单词
          </ThemedText>
        </View>

        {/* 法律信息 */}
        <View style={styles.section}>
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.sectionTitle}>
            法律信息
          </ThemedText>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => handleOpenLink(LEGAL_DOCS.privacyPolicy, '隐私政策')}
          >
            <View style={styles.linkContent}>
              <FontAwesome6 name="shield-halved" size={20} color={theme.primary} style={styles.linkIcon} />
              <ThemedText variant="body" color={theme.textPrimary}>隐私政策</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} style={styles.linkArrow} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => handleOpenLink(LEGAL_DOCS.termsOfService, '用户协议')}
          >
            <View style={styles.linkContent}>
              <FontAwesome6 name="file-contract" size={20} color={theme.primary} style={styles.linkIcon} />
              <ThemedText variant="body" color={theme.textPrimary}>用户协议</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} style={styles.linkArrow} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => handleOpenLink(LEGAL_DOCS.permissions, '应用权限说明')}
          >
            <View style={styles.linkContent}>
              <FontAwesome6 name="unlock-keyhole" size={20} color={theme.primary} style={styles.linkIcon} />
              <ThemedText variant="body" color={theme.textPrimary}>应用权限说明</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} style={styles.linkArrow} />
          </TouchableOpacity>
        </View>

        {/* 应用信息 */}
        <View style={styles.section}>
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.sectionTitle}>
            应用信息
          </ThemedText>

          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.infoLabel}>
                版本号
              </ThemedText>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.infoValue}>
                {APP_VERSION}
              </ThemedText>
            </View>

            <View style={styles.infoItem}>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.infoLabel}>
                开发者
              </ThemedText>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.infoValue}>
                {DEVELOPER}
              </ThemedText>
            </View>

            <View style={styles.infoItem}>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.infoLabel}>
                数据存储
              </ThemedText>
              <ThemedText variant="body" color={theme.primary} style={styles.infoValue}>
                本地存储（离线）
              </ThemedText>
            </View>

            <View style={styles.infoItem}>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.infoLabel}>
                技术架构
              </ThemedText>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.infoValue}>
                React Native + SQLite
              </ThemedText>
            </View>
          </View>
        </View>

        {/* 联系我们 */}
        <View style={styles.section}>
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.sectionTitle}>
            联系我们
          </ThemedText>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => handleOpenLink(`mailto:${CONTACT_EMAIL}`, '邮箱')}
          >
            <View style={styles.linkContent}>
              <FontAwesome6 name="envelope" size={20} color={theme.primary} style={styles.linkIcon} />
              <ThemedText variant="body" color={theme.textPrimary}>发送邮件</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} style={styles.linkArrow} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => {
              Alert.alert(
                '反馈与建议',
                '如果您有任何问题或建议，欢迎通过邮件联系我们：\n\n' + CONTACT_EMAIL,
                [{ text: '确定' }]
              );
            }}
          >
            <View style={styles.linkContent}>
              <FontAwesome6 name="comment-dots" size={20} color={theme.primary} style={styles.linkIcon} />
              <ThemedText variant="body" color={theme.textPrimary}>反馈与建议</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} style={styles.linkArrow} />
          </TouchableOpacity>
        </View>

        {/* 开源许可 */}
        <View style={styles.section}>
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.sectionTitle}>
            开源许可
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary}>
            本应用使用了以下开源软件，感谢开源社区的贡献：
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted}>
            • React Native\n• Expo\n• SQLite\n• FontAwesome6
          </ThemedText>
        </View>

        {/* 页脚 */}
        <View style={styles.footer}>
          <ThemedText variant="caption" color={theme.textMuted} style={styles.footerText}>
            使用本应用即表示您同意我们的隐私政策和用户协议
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted} style={styles.copyright}>
            © 2025 {DEVELOPER}. All rights reserved.
          </ThemedText>
        </View>
      </ScrollView>

      {/* 法律文档预览 Modal */}
      <Modal
        visible={selectedDoc !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDoc(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
            activeOpacity={1}
            onPress={() => setSelectedDoc(null)}
          >
            <ThemedView level="default" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText variant="h3" color={theme.textPrimary}>
                  {selectedDoc}
                </ThemedText>
                <TouchableOpacity onPress={() => setSelectedDoc(null)}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <ThemedText variant="body" color={theme.textSecondary}>
                  {selectedDoc && getDocContent(selectedDoc)}
                </ThemedText>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    if (selectedDoc === '隐私政策') {
                      handleOpenLink(LEGAL_DOCS.privacyPolicy, '隐私政策');
                    } else if (selectedDoc === '用户协议') {
                      handleOpenLink(LEGAL_DOCS.termsOfService, '用户协议');
                    } else if (selectedDoc === '应用权限说明') {
                      handleOpenLink(LEGAL_DOCS.permissions, '应用权限说明');
                    }
                  }}
                >
                  <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>
                    查看完整文档
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
