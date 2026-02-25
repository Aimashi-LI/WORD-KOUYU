import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getReviewStats, getReviewPlanGrouped, ReviewStats, ReviewGroup, getWordsByDateRange, getReviewPlan } from '@/database/reviewPlanDao';
import { initDatabase } from '@/database';
import { CalendarView } from '@/components/CalendarView';

export default function ReviewPlanScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  
  const [stats, setStats] = useState<ReviewStats>({
    totalWords: 0,
    masteredWords: 0,
    pendingWords: 0,
    masteryRate: 0,
    averageStability: 0,
    totalReviewCount: 0
  });
  
  const [reviewGroups, setReviewGroups] = useState<ReviewGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // 日历相关状态
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [markedDates, setMarkedDates] = useState<string[]>([]);
  const [markedDatesCount, setMarkedDatesCount] = useState<Record<string, number>>({});
  const [selectedDateWords, setSelectedDateWords] = useState<any[]>([]);
  
  // 判断今天是否有待复习的单词
  const hasTodayWords = useMemo(() => {
    if (reviewGroups.length === 0) return false;
    const todayGroup = reviewGroups.find(g => g.label === '今天待复习');
    return todayGroup ? todayGroup.totalWords > 0 : false;
  }, [reviewGroups]);
  
  const loadData = useCallback(async () => {
    try {
      await initDatabase();
      
      const [reviewStats, groups, plan] = await Promise.all([
        getReviewStats(),
        getReviewPlanGrouped(),
        getReviewPlan(60)  // 获取 60 天的复习计划用于日历标记
      ]);
      
      setStats(reviewStats);
      setReviewGroups(groups);
      
      // 提取有复习计划的日期
      const dates = plan.map(item => item.date);
      setMarkedDates(dates);
      
      // 提取每个日期的复习计划数量
      const countMap: Record<string, number> = {};
      plan.forEach(item => {
        countMap[item.date] = item.count;
      });
      setMarkedDatesCount(countMap);
    } catch (error) {
      console.error('加载复习计划失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);
  
  const handleStartReview = async (startDate: Date, endDate: Date) => {
    try {
      const words = await getWordsByDateRange(startDate, endDate);
      if (words.length === 0) {
        return;
      }
      
      // 跳转到复习页面
      router.push('/review-detail', { 
        wordIds: words.map(w => w.id).join(','),
        source: 'plan'
      });
    } catch (error) {
      console.error('开始复习失败:', error);
    }
  };
  
  const handleQuickReview = async () => {
    // 获取今天的待复习单词
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await handleStartReview(today, tomorrow);
  };
  
  // 日期选择处理
  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    
    try {
      // 获取选中日期的复习单词
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      const words = await getWordsByDateRange(startDate, endDate);
      setSelectedDateWords(words);
    } catch (error) {
      console.error('获取选中日期复习单词失败:', error);
      setSelectedDateWords([]);
    }
  };
  
  const formatStability = (stability: number | undefined | null): string => {
    // 确保总是返回字符串，避免渲染错误
    try {
      if (stability === undefined || stability === null || isNaN(stability)) {
        return '未知';
      }
      if (stability < 7) {
        return '刚开始';
      } else if (stability < 14) {
        return '学习中';
      } else if (stability < 30) {
        return '较稳定';
      } else if (stability < 60) {
        return '稳定';
      } else {
        return '很稳定';
      }
    } catch (error) {
      console.error('[formatStability] Error:', error);
      return '未知';
    }
  };
  
  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* 统计卡片 */}
        <ThemedView level="default" style={styles.statsCard}>
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.statsTitle}>
            复习效果概览
          </ThemedText>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText variant="h2" color={theme.primary}>{stats.totalWords}</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>总单词</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText variant="h2" color={theme.success}>{stats.masteredWords}</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>已掌握</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText variant="h2" color={theme.warning}>{stats.pendingWords}</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>待复习</ThemedText>
            </View>
          </View>
          
          <View style={styles.progressRow}>
            <ThemedText variant="caption" color={theme.textSecondary}>
              掌握率: {stats.masteryRate}%
            </ThemedText>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${stats.masteryRate}%` }]} />
            </View>
          </View>
          
          <View style={styles.extraStats}>
            <View style={styles.extraStatItem}>
              <FontAwesome6 name="chart-line" size={14} color={theme.accent} />
              <ThemedText variant="caption" color={theme.textSecondary}>
                平均稳定性: {formatStability(stats.averageStability)}
              </ThemedText>
            </View>
            <View style={styles.extraStatItem}>
              <FontAwesome6 name="rotate" size={14} color={theme.accent} />
              <ThemedText variant="caption" color={theme.textSecondary}>
                总复习次数: {stats.totalReviewCount}
              </ThemedText>
            </View>
          </View>
        </ThemedView>
        
        {/* 日历视图 */}
        <CalendarView
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          markedDates={markedDates}
          markedDatesCount={markedDatesCount}
        />
        
        {/* 选中日期的复习单词 */}
        {selectedDate && selectedDateWords.length > 0 && (
          <ThemedView level="default" style={styles.selectedDateCard}>
            <View style={styles.selectedDateHeader}>
              <ThemedText variant="h4" color={theme.textPrimary}>
                {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 复习计划
              </ThemedText>
              <TouchableOpacity onPress={() => setSelectedDate(undefined)}>
                <FontAwesome6 name="xmark" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            
            {selectedDateWords.map((word) => (
              <TouchableOpacity 
                key={word.id}
                style={styles.selectedDateWordItem}
                onPress={() => router.push('/word-detail', { id: word.id.toString() })}
              >
                <View style={styles.wordInfo}>
                  <ThemedText variant="smallMedium" color={theme.textPrimary}>
                    {word.word}
                  </ThemedText>
                  {word.partOfSpeech && (
                    <ThemedText variant="caption" color={theme.primary} style={styles.partOfSpeech}>
                      {word.partOfSpeech}
                    </ThemedText>
                  )}
                  <ThemedText variant="caption" color={theme.textMuted} numberOfLines={1}>
                    {word.definition}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.startReviewButton}
              onPress={() => {
                const startDate = new Date(selectedDate);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(selectedDate);
                endDate.setHours(23, 59, 59, 999);
                handleStartReview(startDate, endDate);
              }}
            >
              <FontAwesome6 name="play" size={16} color={theme.buttonPrimaryText} />
              <ThemedText variant="caption" color={theme.buttonPrimaryText}>
                开始复习 ({selectedDateWords.length} 个单词)
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
        
        {/* 快捷操作 */}
        <TouchableOpacity 
          style={[
            styles.quickReviewButton,
            !hasTodayWords && styles.quickReviewButtonDisabled
          ]}
          onPress={handleQuickReview}
          disabled={loading || !hasTodayWords}
        >
          <FontAwesome6 
            name="play" 
            size={20} 
            color={!hasTodayWords ? theme.textMuted : theme.buttonPrimaryText} 
          />
          <ThemedText 
            variant="smallMedium" 
            color={!hasTodayWords ? theme.textMuted : theme.buttonPrimaryText}
          >
            {!hasTodayWords ? '暂无今日复习' : '开始今天复习'}
          </ThemedText>
        </TouchableOpacity>
        
        {/* 复习计划时间线 */}
        <ThemedText variant="h3" color={theme.textPrimary} style={styles.sectionTitle}>
          复习计划
        </ThemedText>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText color={theme.textMuted} style={styles.loadingText}>
              加载中...
            </ThemedText>
          </View>
        ) : reviewGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="calendar-check" size={48} color={theme.textMuted} />
            <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
              暂无复习计划
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.emptySubtext}>
              添加单词后开始制定复习计划
            </ThemedText>
          </View>
        ) : (
          reviewGroups.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.groupContainer}>
              <View style={styles.groupHeader}>
                <ThemedText variant="h4" color={theme.textPrimary}>
                  {group.label}
                </ThemedText>
                <ThemedText variant="caption" color={theme.primary}>
                  {group.totalWords} 个单词
                </ThemedText>
              </View>
              
              {group.items.map((item) => (
                <View key={item.date} style={styles.dateItem}>
                  <View style={styles.dateHeader}>
                    <ThemedText variant="body" color={theme.textSecondary} style={styles.dateLabel}>
                      {item.dateLabel}
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.primary} style={styles.timeLabel}>
                      {item.timeLabel}
                    </ThemedText>
                  </View>
                  
                  {/* 按词库分组显示 */}
                  {item.wordbooks && item.wordbooks.length > 0 ? (
                    <View style={styles.wordbookGroups}>
                      {item.wordbooks.map((wb) => (
                        <View key={wb.wordbookId} style={styles.wordbookGroup}>
                          <View style={styles.wordbookGroupHeader}>
                            <ThemedText variant="smallMedium" color={theme.textSecondary}>
                              {wb.wordbookName}
                            </ThemedText>
                            <ThemedText variant="caption" color={theme.primary}>
                              {wb.count} 个单词
                            </ThemedText>
                          </View>
                          {wb.words.map((word) => (
                            <TouchableOpacity 
                              key={word.id}
                              style={styles.wordItem}
                              onPress={() => router.push('/word-detail', { id: word.id.toString() })}
                            >
                              <View style={styles.wordInfo}>
                                <ThemedText variant="smallMedium" color={theme.textPrimary}>
                                  {word.word}
                                </ThemedText>
                                {word.partOfSpeech && (
                                  <ThemedText variant="caption" color={theme.primary} style={styles.partOfSpeech}>
                                    {word.partOfSpeech}
                                  </ThemedText>
                                )}
                                <ThemedText variant="caption" color={theme.textMuted} numberOfLines={1}>
                                  {word.definition}
                                </ThemedText>
                              </View>
                              
                              <View style={styles.wordStatus}>
                                <ThemedText variant="caption" color={theme.textMuted}>
                                  {formatStability(word.stability)}
                                </ThemedText>
                                {word.is_mastered && (
                                  <FontAwesome6 name="circle-check" size={16} color={theme.success} />
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ))}
                    </View>
                  ) : (
                    // 没有词库分组时显示原始单词列表
                    item.words.map((word) => (
                      <TouchableOpacity 
                        key={word.id}
                        style={styles.wordItem}
                        onPress={() => router.push('/word-detail', { id: word.id.toString() })}
                      >
                        <View style={styles.wordInfo}>
                          <ThemedText variant="smallMedium" color={theme.textPrimary}>
                            {word.word}
                          </ThemedText>
                          {word.partOfSpeech && (
                            <ThemedText variant="caption" color={theme.primary} style={styles.partOfSpeech}>
                              {word.partOfSpeech}
                            </ThemedText>
                          )}
                          <ThemedText variant="caption" color={theme.textMuted} numberOfLines={1}>
                            {word.definition}
                          </ThemedText>
                        </View>
                        
                        <View style={styles.wordStatus}>
                          <ThemedText variant="caption" color={theme.textMuted}>
                            {formatStability(word.stability)}
                          </ThemedText>
                          {word.is_mastered && (
                            <FontAwesome6 name="circle-check" size={16} color={theme.success} />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
