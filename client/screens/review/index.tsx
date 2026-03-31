import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getAllWordbooks, getWordsInWordbook } from '@/database/wordbookDao';
import { initDatabase, getDatabase } from '@/database';
import { Wordbook, Word } from '@/database/types';
import { useAI, ReviewAnalysisResponse } from '@/hooks/useAI';

type ReviewProject = Wordbook & {
  pendingReview: number;
  masteredCount: number;
};

export default function ReviewHomeScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { isConfigured, generateReviewAnalysis } = useAI();
  
  const [projects, setProjects] = useState<ReviewProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<ReviewAnalysisResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

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

  // AI 分析所有单词，生成复习计划
  const handleAIAnalysis = async () => {
    if (!isConfigured) {
      Alert.alert(
        '提示',
        '尚未配置 AI，请先配置 AI API 密钥',
        [
          { text: '取消', style: 'cancel' },
          { text: '去配置', onPress: () => router.push('/ai-settings') },
        ]
      );
      return;
    }

    setAnalyzing(true);
    try {
      // 获取所有单词
      const allWords: Word[] = [];
      for (const project of projects) {
        const words = await getWordsInWordbook(project.id);
        allWords.push(...words);
      }

      if (allWords.length === 0) {
        Alert.alert('提示', '没有单词可以分析');
        return;
      }

      // 计算每个单词的可提取性和距上次复习天数
      const now = new Date();
      const wordsWithAnalysis = allWords.map(w => {
        const lastReview = w.last_review ? new Date(w.last_review) : null;
        const nextReview = w.next_review ? new Date(w.next_review) : null;
        
        let retrievability = 1.0;
        let daysSinceLastReview = 0;
        
        if (w.stability > 0 && lastReview) {
          const elapsedDays = (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);
          retrievability = Math.exp(-elapsedDays / w.stability);
          daysSinceLastReview = elapsedDays;
        }

        return {
          id: w.id,
          word: w.word,
          definition: w.definition,
          stability: w.stability,
          difficulty: w.difficulty,
          reviewCount: w.review_count,
          lastScore: undefined, // 可以从复习日志获取
          retrievability,
          daysSinceLastReview,
          nextReviewDate: w.next_review || undefined,
          isMastered: w.is_mastered === 1,
          lastReviewDate: w.last_review || undefined,
        };
      });

      // 调用 AI 分析
      const result = await generateReviewAnalysis(wordsWithAnalysis, {
        currentTime: now.toLocaleString('zh-CN'),
        studyGoal: '高效复习',
      });

      if (result) {
        setAiAnalysis(result);
      }
    } catch (error) {
      console.error('AI 分析失败:', error);
      Alert.alert('错误', 'AI 分析失败，请重试');
    } finally {
      setAnalyzing(false);
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
              const db = getDatabase();
              await db.runAsync('DELETE FROM wordbooks WHERE id = ?', [project.id]);
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
    console.log('[ReviewHome] 开始复习，projectId:', projectId);
    router.push('/review-detail', { projectId: projectId.toString() });
  };

  // 根据 AI 分析结果开始复习
  const handleStartAIReview = () => {
    if (!aiAnalysis || aiAnalysis.reviewPlan.length === 0) {
      Alert.alert('提示', '暂无需要复习的单词');
      return;
    }

    // 获取需要复习的单词ID列表
    const wordIds = aiAnalysis.reviewPlan.map(p => p.wordId);
    router.push('/review-detail', { 
      aiReviewWords: wordIds.join(','),
      aiPlan: JSON.stringify(aiAnalysis.reviewPlan),
    });
  };

  const renderProjectCard = (project: ReviewProject) => {
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

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* AI 复习分析卡片 */}
          <TouchableOpacity
            style={styles.aiCard}
            onPress={handleAIAnalysis}
            disabled={analyzing}
          >
            <View style={styles.aiCardContent}>
              {analyzing ? (
                <ActivityIndicator size="large" color={theme.primary} />
              ) : (
                <>
                  <FontAwesome6 name="brain" size={40} color={theme.primary} />
                  <View style={styles.aiCardTextContainer}>
                    <ThemedText variant="h3" color={theme.textPrimary}>
                      AI 智能复习分析
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      让 AI 分析您的学习状态，生成个性化复习计划
                    </ThemedText>
                  </View>
                  <FontAwesome6 name="chevron-right" size={20} color={theme.textMuted} />
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* AI 分析结果 */}
          {aiAnalysis && (
            <ThemedView level="default" style={styles.analysisCard}>
              <View style={styles.analysisHeader}>
                <FontAwesome6 name="chart-line" size={24} color={theme.primary} />
                <ThemedText variant="h3" color={theme.textPrimary}>AI 分析结果</ThemedText>
              </View>
              
              <ThemedText variant="body" color={theme.textSecondary} style={styles.analysisSummary}>
                {aiAnalysis.analysis.summary}
              </ThemedText>

              <View style={styles.analysisStats}>
                <View style={styles.analysisStatItem}>
                  <ThemedText variant="h2" color={theme.error}>{aiAnalysis.analysis.urgentCount}</ThemedText>
                  <ThemedText variant="caption" color={theme.textMuted}>紧急复习</ThemedText>
                </View>
                <View style={styles.analysisStatItem}>
                  <ThemedText variant="h2" color={theme.warning}>{aiAnalysis.analysis.suggestedCount}</ThemedText>
                  <ThemedText variant="caption" color={theme.textMuted}>建议今日复习</ThemedText>
                </View>
              </View>

              {/* 复习建议 */}
              {aiAnalysis.recommendations.length > 0 && (
                <View style={styles.recommendationsSection}>
                  <ThemedText variant="body" color={theme.textPrimary}>学习建议</ThemedText>
                  {aiAnalysis.recommendations.map((rec, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <FontAwesome6 
                        name={rec.type === 'timing' ? 'clock' : rec.type === 'method' ? 'lightbulb' : 'bell'} 
                        size={16} 
                        color={theme.primary} 
                      />
                      <ThemedText variant="caption" color={theme.textSecondary}>{rec.message}</ThemedText>
                    </View>
                  ))}
                </View>
              )}

              {/* 开始 AI 推荐复习 */}
              {aiAnalysis.reviewPlan.length > 0 && (
                <TouchableOpacity style={styles.aiReviewButton} onPress={handleStartAIReview}>
                  <FontAwesome6 name="play" size={20} color={theme.buttonPrimaryText} />
                  <ThemedText variant="body" color={theme.buttonPrimaryText}>
                    开始 AI 推荐复习 ({aiAnalysis.reviewPlan.length} 个单词)
                  </ThemedText>
                </TouchableOpacity>
              )}
            </ThemedView>
          )}

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
