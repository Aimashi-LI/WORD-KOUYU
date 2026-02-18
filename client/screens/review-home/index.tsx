import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getAllWordbooks, createWordbook, deleteWordbook, getWordsInWordbook } from '@/database/wordbookDao';
import { initDatabase } from '@/database';
import { Wordbook } from '@/database/types';
import { useCallback } from 'react';

type ReviewProject = Wordbook & {
  pendingReview: number;
  masteredCount: number;
};

export default function ReviewHomeScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  
  const [projects, setProjects] = useState<ReviewProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [])
  );

  const loadProjects = async () => {
    try {
      await initDatabase();
      const wordbooks = await getAllWordbooks();
      
      // 计算每个词库的统计信息
      const projectStats = await Promise.all(
        wordbooks.map(async (wb) => {
          const words = await getWordsInWordbook(wb.id);
          const now = new Date();
          
          const pendingReview = words.filter(w => {
            if (!w.next_review) return true;
            return new Date(w.next_review) <= now;
          }).length;
          
          const masteredCount = words.filter(w => w.is_mastered === 1).length;
          
          return {
            ...wb,
            pendingReview,
            masteredCount,
          };
        })
      );
      
      setProjects(projectStats);
    } catch (error) {
      console.error('加载复习项目失败:', error);
      Alert.alert('错误', '加载复习项目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      Alert.alert('提示', '请输入项目名称');
      return;
    }

    setCreating(true);
    try {
      await createWordbook(newProjectName.trim(), newProjectDesc.trim() || undefined);
      setNewProjectName('');
      setNewProjectDesc('');
      setShowCreateModal(false);
      await loadProjects();
      Alert.alert('成功', '复习项目已创建');
    } catch (error) {
      console.error('创建项目失败:', error);
      Alert.alert('错误', '创建失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = (project: ReviewProject) => {
    Alert.alert(
      '确认删除',
      `确定要删除复习项目"${project.name}"吗？\n该操作不会删除单词，只是从项目中移除。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWordbook(project.id);
              await loadProjects();
              Alert.alert('成功', '项目已删除');
            } catch (error) {
              console.error('删除项目失败:', error);
              Alert.alert('错误', '删除失败，请重试');
            }
          }
        }
      ]
    );
  };

  const handleStartReview = (projectId: number) => {
    router.push('/review', { projectId: projectId.toString() });
  };

  const renderProjectCard = (project: ReviewProject) => (
    <ThemedView key={project.id} level="default" style={styles.projectCard}>
      <TouchableOpacity 
        style={styles.projectContent}
        onPress={() => handleStartReview(project.id)}
      >
        <View style={styles.projectHeader}>
          <View style={styles.projectTitleContainer}>
            <FontAwesome6 
              name="folder" 
              size={24} 
              color={theme.primary} 
              style={styles.projectIcon} 
            />
            <View>
              <ThemedText variant="h3" color={theme.textPrimary}>
                {project.name}
              </ThemedText>
              {project.description && (
                <ThemedText variant="caption" color={theme.textMuted}>
                  {project.description}
                </ThemedText>
              )}
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteProject(project)}
          >
            <FontAwesome6 name="trash" size={18} color={theme.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText variant="h3" color={theme.textPrimary}>
              {project.word_count}
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>总单词</ThemedText>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <ThemedText variant="h3" color={theme.warning}>
              {project.pendingReview}
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>待复习</ThemedText>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <ThemedText variant="h3" color={theme.success}>
              {project.masteredCount}
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted}>已掌握</ThemedText>
          </View>
        </View>

        {project.pendingReview > 0 && (
          <View style={styles.reviewButtonContainer}>
            <ThemedText variant="caption" color={theme.buttonPrimaryText}>
              {project.pendingReview} 个单词待复习，点击开始
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>
    </ThemedView>
  );

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* 标题栏 */}
        <View style={styles.header}>
          <ThemedText variant="h1" color={theme.textPrimary}>复习</ThemedText>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <FontAwesome6 name="plus" size={20} color={theme.buttonPrimaryText} />
            <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>
              新建项目
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* 项目列表 */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ThemedText color={theme.textMuted}>加载中...</ThemedText>
            </View>
          ) : projects.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="folder-open" size={64} color={theme.textMuted} />
              <ThemedText variant="h3" color={theme.textMuted} style={styles.emptyTitle}>
                暂无复习项目
              </ThemedText>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.emptyText}>
                点击右上角创建新的复习项目
              </ThemedText>
            </View>
          ) : (
            projects.map(renderProjectCard)
          )}
        </ScrollView>
      </View>

      {/* 创建项目模态框 */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText variant="h3" color={theme.textPrimary}>新建复习项目</ThemedText>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                  项目名称 *
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
                  value={newProjectName}
                  onChangeText={setNewProjectName}
                  placeholder="例如：四级词汇"
                  placeholderTextColor={theme.textMuted}
                  autoFocus
                />

                <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                  描述（可选）
                </ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, { color: theme.textPrimary, borderColor: theme.border }]}
                  value={newProjectDesc}
                  onChangeText={setNewProjectDesc}
                  placeholder="添加项目描述..."
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.backgroundTertiary }]}
                  onPress={() => setShowCreateModal(false)}
                >
                  <ThemedText variant="body" color={theme.textPrimary}>取消</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.primary }]}
                  onPress={handleCreateProject}
                  disabled={creating}
                >
                  <ThemedText variant="body" color={theme.buttonPrimaryText}>
                    {creating ? '创建中...' : '创建'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
