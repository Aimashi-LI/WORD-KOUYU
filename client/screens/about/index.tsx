import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { getAllWords, deleteWords } from '@/database/wordDao';
import { createStyles } from './styles';

// 从 package.json 读取版本号
const APP_VERSION = '1.0.0';
const APP_NAME = '编码记忆法';
const DEVELOPER = '小浣熊';
const CONTACT_EMAIL = '2487717060@qq.com';

// 法律文档内容（简化版，用于应用内展示）
const LEGAL_DOCS = {
  privacyPolicy: `# 隐私政策

**最后更新日期：2026年2月**

## 引言
欢迎使用"编码记忆法"（以下简称"本应用"）。我们非常重视您的隐私权和数据安全。

本应用是一款完全离线的单词学习工具，所有数据均存储在您的设备本地，我们不会收集、存储或传输您的任何个人信息到云端服务器。

## 信息收集
本应用**不会主动收集**您的任何个人信息，包括：
- ❌ 个人身份信息（姓名、电话、邮箱等）
- ❌ 设备信息（IMEI、MAC地址等）
- ❌ 地理位置
- ❌ 照片/图像
- ❌ 录音
- ❌ 通讯录
- ❌ 使用日志

## 本地存储的数据
以下数据仅存储在您的设备本地 SQLite 数据库中：
- 单词数据、音标、释义、助记等学习内容
- 学习进度、复习计划、掌握状态
- 自定义编码库
- 应用设置（如主题、通知等）

## 信息使用
由于本应用不收集您的个人信息，所有本地数据仅用于：
- 提供单词学习功能
- 跟踪您的学习进度
- 提供智能复习提醒
- 保存您的个性化设置

## 数据共享
我们**不会**将您的数据共享给任何第三方。

## 您的权利
您对本地的所有数据拥有完全的控制权，可以：
- ✅ 查看所有存储的单词数据
- ✅ 编辑或删除任何单词
- ✅ 导出所有数据
- ✅ 清空应用数据

## 联系我们
如有疑问，请通过邮件联系我们：${CONTACT_EMAIL}`,

  termsOfService: `# 用户协议

**最后更新日期：2026年2月**

## 协议的接受
使用本应用即表示您已阅读、理解并同意受本协议条款的约束。

## 应用描述
"编码记忆法"是一款基于 FSRS（Free Spaced Repetition Scheduler）算法优化的艾宾浩斯记忆法和编码拆分技术的单词学习应用，主要功能包括：
- 单词本管理
- 智能复习（FSRS）
- 刷单词模式
- 数据导入导出

## 用户权利与义务
### 用户权利
- ✅ 自由使用本应用提供的所有功能
- ✅ 对本地数据拥有完全控制权
- ✅ 导出和备份您的学习数据
- ✅ 获得应用更新和技术支持

### 用户义务
1. **合法使用**
   - 仅将本应用用于个人学习和记忆训练
   - 不得将本应用用于任何非法或违反法律法规的目的

2. **数据责任**
   - 您对添加到应用的所有单词数据负责
   - 确保导入的内容不侵犯第三方的知识产权
   - 妥善保管导出的数据文件，避免泄露给他人

3. **禁止行为**
   - 不得逆向工程、反编译或反汇编本应用
   - 不得破解、修改或复制本应用的代码
   - 不得删除或修改应用中的版权声明
   - 不得将本应用用于商业用途（未经授权）

4. **内容规范**
   - 不得添加违法违规、暴力色情、政治敏感等内容
   - 不得添加侵犯他人商标、专利、著作权的内容
   - 遵守当地法律法规和公序良俗

## 知识产权
本应用的所有知识产权归开发者所有。

## 免责声明
- 本应用以"现状"和"可用"的基础提供，不提供任何明示或暗示的保证
- 我们不保证应用永不出现故障、错误或不中断
- 学习效果因人而异，我们不保证使用本应用一定能达到预期的学习效果

## 联系我们
如有疑问，请通过邮件联系我们：${CONTACT_EMAIL}`,

  permissions: `# 应用权限说明

**最后更新日期：2026年2月**

## 引言
本应用是一款完全离线的单词学习工具。我们遵循"最小权限原则"，仅在必要时才请求系统权限。

## Android 权限说明
### 存储权限（可选）
**用途说明**：
- 导出词库数据为 CSV/JSON 文件到设备存储
- 从设备存储导入词库文件

**请求时机**：仅在您点击"导出词库"或"导入词库"功能时请求

**是否必需**：❌ 否（可选权限）

### 其他权限
- ❌ 网络权限：不使用（应用完全离线运行）
- ❌ 相机权限：不使用
- ❌ 麦克风权限：不使用
- ❌ 位置权限：不使用
- ❌ 通讯录权限：不使用

## iOS 权限说明
### 照片库权限（可选）
**用途说明**：
- 选择保存导出文件的存储位置
- 选择要导入的词库文件

**是否必需**：❌ 否（可选权限）

### 其他权限
- ❌ 相机权限：不使用
- ❌ 麦克风权限：不使用
- ❌ 位置权限：不使用

## 权限请求原则
我们承诺：
- ✅ 仅申请必要的最小权限
- ✅ 明确说明权限用途
- ✅ 不在后台滥用权限
- ✅ 不收集与功能无关的数据

## 联系我们
如有疑问，请通过邮件联系我们：${CONTACT_EMAIL}`
};

export default function AboutScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedDoc, setSelectedDoc] = useState<{ title: string; content: string } | null>(null);

  const showLegalDoc = (title: string, content: string) => {
    setSelectedDoc({ title, content });
  };

  const handleCopyEmail = async () => {
    try {
      await Clipboard.setStringAsync(CONTACT_EMAIL);
      Alert.alert('已复制', '邮箱地址已复制到剪贴板');
    } catch (error) {
      Alert.alert('复制失败', '无法复制邮箱地址，请稍后重试');
    }
  };

  const handleDeleteTestWords = async () => {
    try {
      const words = await getAllWords();
      if (words.length === 0) {
        Alert.alert('提示', '当前没有单词数据');
        return;
      }

      Alert.alert(
        '确认删除',
        `当前共有 ${words.length} 个单词，确定要全部删除吗？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '确定删除',
            style: 'destructive',
            onPress: async () => {
              try {
                const ids = words.map(w => w.id);
                await deleteWords(ids);
                Alert.alert('成功', `已删除 ${ids.length} 个单词`);
              } catch (error) {
                Alert.alert('删除失败', error instanceof Error ? error.message : '未知错误');
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('查询失败', error instanceof Error ? error.message : '未知错误');
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
            onPress={() => showLegalDoc('隐私政策', LEGAL_DOCS.privacyPolicy)}
          >
            <View style={styles.linkContent}>
              <FontAwesome6 name="shield-halved" size={20} color={theme.primary} style={styles.linkIcon} />
              <ThemedText variant="body" color={theme.textPrimary}>隐私政策</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} style={styles.linkArrow} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => showLegalDoc('用户协议', LEGAL_DOCS.termsOfService)}
          >
            <View style={styles.linkContent}>
              <FontAwesome6 name="file-contract" size={20} color={theme.primary} style={styles.linkIcon} />
              <ThemedText variant="body" color={theme.textPrimary}>用户协议</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} style={styles.linkArrow} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => showLegalDoc('应用权限说明', LEGAL_DOCS.permissions)}
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

          <View style={styles.contactInfo}>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.contactLabel}>
              如有任何疑问或建议，欢迎通过以下邮箱联系我们：
            </ThemedText>
            <TouchableOpacity
              style={styles.emailContainer}
              onLongPress={handleCopyEmail}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="envelope" size={20} color={theme.primary} style={styles.emailIcon} />
              <ThemedText variant="body" color={theme.primary} style={styles.emailText}>
                {CONTACT_EMAIL}
              </ThemedText>
            </TouchableOpacity>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.copyHint}>
              长按邮箱地址可复制
            </ThemedText>
          </View>
        </View>

        {/* 开发者选项 */}
        <View style={styles.section}>
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.sectionTitle}>
            开发者选项
          </ThemedText>
          <TouchableOpacity
            style={styles.developerOption}
            onPress={handleDeleteTestWords}
          >
            <FontAwesome6 name="trash-can" size={20} color={theme.error} style={styles.optionIcon} />
            <ThemedText variant="body" color={theme.error} style={styles.optionText}>
              删除所有单词数据
            </ThemedText>
          </TouchableOpacity>
          <ThemedText variant="caption" color={theme.textMuted} style={styles.developerHint}>
            用于清理测试数据，请谨慎操作
          </ThemedText>
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

      {/* 法律文档展示 Modal */}
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
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => setSelectedDoc(null)}
            />
            <ThemedView level="default" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText variant="h3" color={theme.textPrimary}>
                  {selectedDoc?.title}
                </ThemedText>
                <TouchableOpacity onPress={() => setSelectedDoc(null)}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                <ThemedText variant="body" color={theme.textSecondary} style={styles.docText}>
                  {selectedDoc?.content}
                </ThemedText>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setSelectedDoc(null)}
                >
                  <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>
                    关闭
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
