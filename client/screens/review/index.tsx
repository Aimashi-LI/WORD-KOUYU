import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getAllWordbooks, deleteWordbook, getWordsInWordbook } from '@/database/wordbookDao';
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
    console.log('[ReviewHome] ========== 点击开始复习 ==========');
    console.log('[ReviewHome] projectId:', projectId);
    console.log('[ReviewHome] 路由路径:', '/review-detail');
    console.log('[ReviewHome] 路由参数:', { projectId: projectId.toString() });

    try {
      router.push('/review-detail', { projectId: projectId.toString() });
      console.log('[ReviewHome] router.push 调用成功');
    } catch (error) {
      console.error('[ReviewHome] router.push 调用失败:', error);
    }
  };

  const renderProjectCard = (project: ReviewProject) => {
    console.log('[ReviewHome] 渲染项目卡片:', project.name, 'ID:', project.id);
    
    return (
      <ThemedView key={project.id} level="default" style={styles.projectCard}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleStartReview(project.id)}
        >
          <View style={styles.projectContent}>
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
                activeOpacity={0.7}
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteProject(project);
                }}
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
          </View>
        </TouchableOpacity>
      </ThemedView>
    );
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* 标题栏 */}
        <View style={styles.header}>
          <ThemedText variant="h1" color={theme.textPrimary}>复习</ThemedText>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          overScrollMode="never"
        >
          {/* 复习计划入口 */}
          <TouchableOpacity
            style={styles.planCard}
            onPress={() => router.push('/review-plan')}
          >
            <View style={styles.planContent}>
              <FontAwesome6 name="calendar-days" size={32} color={theme.primary} style={styles.planIcon} />
              <View style={styles.planTextContainer}>
                <ThemedText variant="h3" color={theme.textPrimary}>
                  复习计划
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  查看详细的复习安排和进度
                </ThemedText>
              </View>
              <FontAwesome6 name="chevron-right" size={20} color={theme.textMuted} />
            </View>
          </TouchableOpacity>

          {/* 项目列表标题 */}
          <ThemedText variant="h4" color={theme.textSecondary} style={styles.sectionTitle}>
            复习项目
          </ThemedText>

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
                请在单词本页面创建词库后进行复习
              </ThemedText>
            </View>
          ) : (
            projects.map(renderProjectCard)
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}
