import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getAllWordbooks, getWordsInWordbook } from '@/database/wordbookDao';
import { initDatabase } from '@/database';
import { Word, Wordbook } from '@/database/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 统计数据类型
interface DailyStats {
  date: string;
  totalReview: number;
  completedReview: number;
  pendingReview: number;
}

export default function ReviewPlanScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyStats, setDailyStats] = useState<Map<string, DailyStats>>(new Map());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [listDays, setListDays] = useState<'7' | '30'>('7');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [bestReviewTime, setBestReviewTime] = useState('09:00');
  const [loading, setLoading] = useState(true);
  
  // 新增：存储每个日期的待复习单词列表
  const [dailyPendingWords, setDailyPendingWords] = useState<Map<string, Word[]>>(new Map());
  
  // 新增：存储每个日期的按词库分组的待复习单词
  const [dailyWordbookPendingWords, setDailyWordbookPendingWords] = useState<Map<string, Map<number, Word[]>>>(new Map());
  
  // 新增：控制单词详情展开的状态
  const [expandedWordId, setExpandedWordId] = useState<number | null>(null);
  
  // 新增：控制提前复习弹窗
  const [showEarlyReviewModal, setShowEarlyReviewModal] = useState(false);
  const [earlyReviewDate, setEarlyReviewDate] = useState<Date | null>(null);

  // 新增：提前复习模式相关状态
  const [isEarlyReviewMode, setIsEarlyReviewMode] = useState(false);
  const [selectedWordbookIds, setSelectedWordbookIds] = useState<Set<number>>(new Set());
  const [dailyWordbookList, setDailyWordbookList] = useState<Map<number, Wordbook>>(new Map());
  
  // 新增：词库详情相关状态
  const [showWordbookDetail, setShowWordbookDetail] = useState(false);
  const [currentWordbookId, setCurrentWordbookId] = useState<number | null>(null);
  const [currentWordbookWords, setCurrentWordbookWords] = useState<Word[]>([]);

  // 加载复习数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await initDatabase();
      const wordbooks = await getAllWordbooks();

      // 获取所有单词的复习信息，并记录所属词库
      const allWords: Word[] = [];
      const wordWordbookMap = new Map<number, Set<number>>(); // 单词ID -> 词库ID集合
      
      for (const wb of wordbooks) {
        const words = await getWordsInWordbook(wb.id);
        words.forEach(word => {
          allWords.push(word);
          // 记录单词所属的词库
          if (!wordWordbookMap.has(word.id)) {
            wordWordbookMap.set(word.id, new Set());
          }
          wordWordbookMap.get(word.id)!.add(wb.id);
        });
      }

      // 去重：避免同一个单词在多个词库中重复出现
      const uniqueWordsMap = new Map<number, Word>();
      allWords.forEach((word) => {
        uniqueWordsMap.set(word.id, word);
      });
      const uniqueWords = Array.from(uniqueWordsMap.values());

      console.log('[ReviewPlan] 去重前单词数:', allWords.length, '去重后单词数:', uniqueWords.length);

      // 计算未来60天的统计数据
      const statsMap = new Map<string, DailyStats>();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < 60; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        statsMap.set(dateStr, {
          date: dateStr,
          totalReview: 0,
          completedReview: 0,
          pendingReview: 0,
        });
      }

      // 统计每个单词的复习情况
      const processedDates = new Map<number, string>(); // 追踪每个单词已经添加到哪个日期
      uniqueWords.forEach((word) => {
        if (word.next_review) {
          const reviewDate = new Date(word.next_review);
          reviewDate.setHours(0, 0, 0, 0);
          const dateStr = reviewDate.toISOString().split('T')[0];

          // 检查这个单词是否已经被添加到其他日期
          if (processedDates.has(word.id)) {
            const existingDateStr = processedDates.get(word.id)!;
            console.warn(`[ReviewPlan] 单词 ${word.word} (ID: ${word.id}) 已被添加到日期 ${existingDateStr}，现在又想添加到日期 ${dateStr}`);
            console.warn('[ReviewPlan] 这可能导致同一个单词出现在多个日期的待复习列表中');
            // 跳过这个重复的单词
            return;
          }

          if (statsMap.has(dateStr)) {
            const stats = statsMap.get(dateStr)!;
            stats.totalReview++;

            if (word.is_mastered === 1) {
              stats.completedReview++;
            } else {
              stats.pendingReview++;
              
              // 记录这个单词已经被添加到这个日期
              processedDates.set(word.id, dateStr);
              
              // 添加到待复习单词列表
              if (!dailyPendingWords.has(dateStr)) {
                dailyPendingWords.set(dateStr, []);
              }
              dailyPendingWords.get(dateStr)!.push(word);
              
              // 添加到按词库分组的待复习单词列表
              if (!dailyWordbookPendingWords.has(dateStr)) {
                dailyWordbookPendingWords.set(dateStr, new Map());
              }
              const wordbookIds = wordWordbookMap.get(word.id) || new Set();
              wordbookIds.forEach(wordbookId => {
                if (!dailyWordbookPendingWords.get(dateStr)!.has(wordbookId)) {
                  dailyWordbookPendingWords.get(dateStr)!.set(wordbookId, []);
                }
                dailyWordbookPendingWords.get(dateStr)!.get(wordbookId)!.push(word);
              });
            }
          }
        }
      });

      // 检查每个日期的待复习列表是否有重复
      dailyPendingWords.forEach((words, dateStr) => {
        const wordIds = words.map(w => w.id);
        const uniqueWordIds = new Set(wordIds);
        if (wordIds.length !== uniqueWordIds.size) {
          console.warn(`[ReviewPlan] 日期 ${dateStr} 的待复习列表中有重复单词！总数：${wordIds.length}，去重后：${uniqueWordIds.size}`);
          console.warn('[ReviewPlan] 重复的单词ID：', wordIds.filter((id, index) => wordIds.indexOf(id) !== index));
          
          // 自动去重
          const uniqueWordsForDate = Array.from(new Map(words.map(w => [w.id, w])).values());
          dailyPendingWords.set(dateStr, uniqueWordsForDate);
        }
      });

      setDailyStats(statsMap);
      setDailyPendingWords(dailyPendingWords);
      setDailyWordbookPendingWords(dailyWordbookPendingWords);
      
      // 保存词库列表映射
      const wordbookMap = new Map<number, Wordbook>();
      wordbooks.forEach(wb => {
        wordbookMap.set(wb.id, wb);
      });
      setDailyWordbookList(wordbookMap);

      // 计算最佳复习时间（基于历史复习时间）
      await calculateBestReviewTime(allWords);

      // 加载提醒设置
      await loadReminderSettings();
    } catch (error) {
      console.error('加载复习数据失败:', error);
      Alert.alert('错误', '加载复习数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 计算最佳复习时间
  const calculateBestReviewTime = async (words: Word[]) => {
    try {
      // 分析复习时间分布
      const hourCounts = new Map<number, number>();

      words.forEach((word) => {
        if (word.last_review) {
          const reviewDate = new Date(word.last_review);
          const hour = reviewDate.getHours();
          hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        }
      });

      // 找出复习次数最多的时间段
      let maxCount = 0;
      let bestHour = 9; // 默认上午9点

      hourCounts.forEach((count, hour) => {
        if (count > maxCount) {
          maxCount = count;
          bestHour = hour;
        }
      });

      // 转换为 HH:mm 格式
      const timeString = `${bestHour.toString().padStart(2, '0')}:00`;
      setBestReviewTime(timeString);
    } catch (error) {
      console.error('计算最佳复习时间失败:', error);
    }
  };

  // 加载提醒设置
  const loadReminderSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem('reminder_enabled');
      const time = await AsyncStorage.getItem('reminder_time');

      setReminderEnabled(enabled === 'true');
      setReminderTime(time || '09:00');
    } catch (error) {
      console.error('加载提醒设置失败:', error);
    }
  };

  // 保存提醒设置
  const saveReminderSettings = async () => {
    try {
      await AsyncStorage.setItem('reminder_enabled', String(reminderEnabled));
      await AsyncStorage.setItem('reminder_time', reminderTime);

      if (reminderEnabled) {
        Alert.alert('成功', `复习提醒已设置为每天 ${reminderTime}`);
      } else {
        Alert.alert('成功', '复习提醒已关闭');
      }

      setShowReminderModal(false);
    } catch (error) {
      console.error('保存提醒设置失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  // 获取指定日期的统计数据
  const getStatsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return dailyStats.get(dateStr);
  };

  // 获取指定日期的待复习单词列表
  const getPendingWordsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const words = dailyPendingWords.get(dateStr) || [];
    
    // 检查是否有重复
    const wordIds = words.map(w => w.id);
    const uniqueWordIds = new Set(wordIds);
    if (wordIds.length !== uniqueWordIds.size) {
      console.warn(`[ReviewPlan] getPendingWordsForDate(${dateStr}): 发现重复单词！`);
      console.warn('[ReviewPlan] 总数：', wordIds.length, '去重后：', uniqueWordIds.size);
      console.warn('[ReviewPlan] 单词ID列表：', wordIds);
      
      // 自动去重返回
      return Array.from(new Map(words.map(w => [w.id, w])).values());
    }
    
    return words;
  };

  // 提前复习
  const startEarlyReview = () => {
    const pendingWords = getPendingWordsForDate(selectedDate);
    if (pendingWords.length === 0) {
      Alert.alert('提示', '当前没有待复习的单词');
      return;
    }
    
    // 保存要复习的日期
    setEarlyReviewDate(selectedDate);
    
    // 默认选中所有词库
    const dateStr = selectedDate.toISOString().split('T')[0];
    const wordbookWordsMap = dailyWordbookPendingWords.get(dateStr) || new Map();
    setSelectedWordbookIds(new Set(Array.from(wordbookWordsMap.keys())));
    
    // 显示提前复习弹窗
    setShowEarlyReviewModal(true);
  };
  
  // 确认提前复习
  const confirmEarlyReview = () => {
    // 检查是否选择了词库
    if (selectedWordbookIds.size === 0) {
      Alert.alert('提示', '请至少选择一个词库');
      return;
    }
    
    // 获取选中词库的待复习单词
    const dateStr = earlyReviewDate!.toISOString().split('T')[0];
    const wordbookWordsMap = dailyWordbookPendingWords.get(dateStr) || new Map();
    
    let pendingWords: Word[] = [];
    selectedWordbookIds.forEach(wordbookId => {
      const words = wordbookWordsMap.get(wordbookId) || [];
      pendingWords = pendingWords.concat(words);
    });
    
    // 去重
    const uniqueWordsMap = new Map<number, Word>();
    pendingWords.forEach((word) => {
      uniqueWordsMap.set(word.id, word);
    });
    const uniquePendingWords = Array.from(uniqueWordsMap.values());
    
    if (uniquePendingWords.length === 0) {
      Alert.alert('提示', '当前没有待复习的单词');
      setShowEarlyReviewModal(false);
      return;
    }
    
    // 计算提前的天数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewDate = new Date(earlyReviewDate!);
    reviewDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // 将单词ID列表转换为JSON字符串传递
    const wordIds = uniquePendingWords.map(w => w.id).join(',');
    router.push('/review-word-list', { earlyReviewWords: wordIds, isEarlyReview: 'true', earlyDays: String(diffDays) });
    
    // 关闭弹窗
    setShowEarlyReviewModal(false);
    setSelectedWordbookIds(new Set());
  };

  // 获取列表视图的数据
  const getListData = (): DailyStats[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = parseInt(listDays);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const result: DailyStats[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const stats = dailyStats.get(dateStr);
      if (stats && stats.totalReview > 0) {
        result.push(stats);
      }
    }

    return result;
  };

  // 格式化日期显示
  const formatDateDisplay = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateStr = date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateStr === todayStr) {
      return '今天';
    } else if (dateStr === tomorrowStr) {
      return '明天';
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  };

  // 计算完成率
  const calculateCompletionRate = (stats: DailyStats) => {
    if (stats.totalReview === 0) return 0;
    return Math.round((stats.completedReview / stats.totalReview) * 100);
  };

  // 生成日历数据
  const generateCalendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 获取月份的第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 获取第一周需要显示的空白天数（星期几）
    const startDay = firstDay.getDay(); // 0 = Sunday

    const days: Date[] = [];

    // 添加空白占位符
    for (let i = 0; i < startDay; i++) {
      days.push(new Date(0)); // 无效日期
    }

    // 添加实际日期
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentDate]);

  // 计算按词库分组的待复习单词
  const wordbookPendingWords = useMemo(() => {
    const selectedDatePendingWords = getPendingWordsForDate(selectedDate);
    
    if (!selectedDatePendingWords || selectedDatePendingWords.length === 0) {
      return [];
    }

    // 按词库ID分组
    const grouped = new Map<number, Word[]>();
    selectedDatePendingWords.forEach((word) => {
      // 这里需要知道单词属于哪个词库，但由于数据结构中没有直接关联，
      // 我们暂时只显示单词列表，后续可以优化为词库级别
      // 为了简化实现，我们将所有单词作为一个"虚拟词库"
      if (!grouped.has(0)) {
        grouped.set(0, []);
      }
      grouped.get(0)!.push(word);
    });

    // 转换为数组格式
    const result = Array.from(grouped.entries()).map(([wordbookId, words]) => ({
      wordbookId,
      wordbookName: wordbookId === 0 ? '全部待复习单词' : `词库 ${wordbookId}`,
      words,
      count: words.length,
    }));

    return result;
  }, [selectedDate, dailyPendingWords]);

  // 切换月份
  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  // 选择日期
  const onDayPress = (date: Date) => {
    setSelectedDate(date);
    const stats = getStatsForDate(date);
    if (stats && stats.totalReview > 0) {
      setShowHistoryModal(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (loading) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loadingContainer}>
          <ThemedText color={theme.textMuted}>加载中...</ThemedText>
        </View>
      </Screen>
    );
  }

  const selectedDateStats = getStatsForDate(selectedDate);
  const selectedDatePendingWords = getPendingWordsForDate(selectedDate);

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* 标题栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={theme.textPrimary}>复习计划</ThemedText>
          <TouchableOpacity onPress={() => setShowReminderModal(true)}>
            <FontAwesome6 name="bell" size={24} color={reminderEnabled ? theme.primary : theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 智能推荐 */}
        <ThemedView level="tertiary" style={styles.recommendationCard}>
          <View style={styles.recommendationContent}>
            <FontAwesome6 name="lightbulb" size={20} color={theme.accent} />
            <View style={styles.recommendationTextContainer}>
              <ThemedText variant="body" color={theme.textPrimary}>
                最佳复习时间：{bestReviewTime}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>
                基于您的学习历史推荐
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* 视图切换 */}
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              viewMode === 'calendar' && { backgroundColor: theme.primary }
            ]}
            onPress={() => setViewMode('calendar')}
          >
            <FontAwesome6
              name="calendar"
              size={16}
              color={viewMode === 'calendar' ? theme.buttonPrimaryText : theme.textMuted}
            />
            <ThemedText
              variant="caption"
              color={viewMode === 'calendar' ? theme.buttonPrimaryText : theme.textMuted}
            >
              日历视图
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              viewMode === 'list' && { backgroundColor: theme.primary }
            ]}
            onPress={() => setViewMode('list')}
          >
            <FontAwesome6
              name="list"
              size={16}
              color={viewMode === 'list' ? theme.buttonPrimaryText : theme.textMuted}
            />
            <ThemedText
              variant="caption"
              color={viewMode === 'list' ? theme.buttonPrimaryText : theme.textMuted}
            >
              列表视图
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent}>
          {viewMode === 'calendar' ? (
            /* 日历视图 */
            <ThemedView level="default" style={styles.calendarContainer}>
              {/* 月份导航 */}
              <View style={styles.monthNavigation}>
                <TouchableOpacity onPress={() => changeMonth(-1)}>
                  <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
                <ThemedText variant="h4" color={theme.textPrimary}>
                  {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
                </ThemedText>
                <TouchableOpacity onPress={() => changeMonth(1)}>
                  <FontAwesome6 name="chevron-right" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* 星期标题 */}
              <View style={styles.weekHeader}>
                {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
                  <View key={index} style={styles.weekDayItem}>
                    <ThemedText variant="caption" color={theme.textMuted}>{day}</ThemedText>
                  </View>
                ))}
              </View>

              {/* 日期网格 */}
              <View style={styles.daysGrid}>
                {generateCalendarDays.map((date, index) => {
                  const isValid = date.getTime() !== 0;
                  const stats = isValid ? getStatsForDate(date) : null;
                  const isSelected = isValid && date.toDateString() === selectedDate.toDateString();
                  const isToday = isValid && date.toDateString() === new Date().toDateString();

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        !isValid && styles.dayCellEmpty,
                      ]}
                      onPress={() => isValid && onDayPress(date)}
                      disabled={!isValid}
                    >
                      {isValid && (
                        <View>
                          <ThemedText
                            variant="body"
                            color={isSelected ? theme.buttonPrimaryText : theme.textPrimary}
                            style={[
                              styles.dayNumber,
                              isToday && styles.dayNumberToday,
                            ]}
                          >
                            {date.getDate()}
                          </ThemedText>
                          {stats && stats.totalReview > 0 && (
                            <View style={[
                              styles.dayDot,
                              { backgroundColor: stats.pendingReview > 0 ? theme.warning : theme.success }
                            ]} />
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 选中日期的统计 */}
              {selectedDateStats && selectedDateStats.totalReview > 0 && (
                <View style={styles.selectedDayStats}>
                  <ThemedText variant="h4" color={theme.textPrimary} style={styles.selectedDayTitle}>
                    {formatDateDisplay(selectedDate)} 复习统计
                  </ThemedText>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <ThemedText variant="h3" color={theme.textPrimary}>
                        {selectedDateStats.totalReview}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textMuted}>总复习</ThemedText>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <ThemedText variant="h3" color={theme.success}>
                        {selectedDateStats.completedReview}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textMuted}>已完成</ThemedText>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <ThemedText variant="h3" color={theme.warning}>
                        {selectedDateStats.pendingReview}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textMuted}>待复习</ThemedText>
                    </View>
                  </View>
                  <View style={styles.completionRateContainer}>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      完成率：{calculateCompletionRate(selectedDateStats)}%
                    </ThemedText>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${calculateCompletionRate(selectedDateStats)}%`, backgroundColor: theme.primary }
                        ]}
                      />
                    </View>
                  </View>

                  {/* 待复习项目列表 */}
                  {selectedDatePendingWords.length > 0 && (
                    <View style={styles.pendingWordsContainer}>
                      <View style={styles.pendingWordsHeader}>
                        <ThemedText variant="body" color={theme.textPrimary} style={styles.pendingWordsTitle}>
                          待复习项目 ({selectedDatePendingWords.length})
                        </ThemedText>
                        {selectedDatePendingWords.length > 0 && (
                          <TouchableOpacity
                            style={[styles.earlyReviewButton, { backgroundColor: theme.primary }]}
                            onPress={startEarlyReview}
                          >
                            <FontAwesome6 name="clock" size={16} color={theme.buttonPrimaryText} />
                            <ThemedText variant="caption" color={theme.buttonPrimaryText} style={styles.earlyReviewButtonText}>
                              提前复习
                            </ThemedText>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* 待复习单词列表 */}
                      {selectedDatePendingWords.map((word) => (
                        <TouchableOpacity
                          key={word.id}
                          style={styles.pendingWordItem}
                          onPress={() => setExpandedWordId(expandedWordId === word.id ? null : word.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.pendingWordHeader}>
                            <View style={styles.pendingWordLeft}>
                              <ThemedText variant="body" color={theme.textPrimary} style={styles.pendingWord}>
                                {word.word}
                              </ThemedText>
                              {word.phonetic && (
                                <ThemedText variant="caption" color={theme.textMuted}>
                                  {word.phonetic}
                                </ThemedText>
                              )}
                            </View>
                            <FontAwesome6
                              name="chevron-down"
                              size={16}
                              color={theme.textMuted}
                              style={[
                                styles.expandIcon,
                                expandedWordId === word.id && { transform: [{ rotate: '180deg' }] }
                              ]}
                            />
                          </View>

                          {/* 单词详情（展开时显示） */}
                          {expandedWordId === word.id && (
                            <View style={styles.pendingWordDetails}>
                              <View style={styles.wordDetailRow}>
                                <ThemedText variant="caption" color={theme.textMuted} style={styles.wordDetailLabel}>
                                  释义：
                                </ThemedText>
                                <ThemedText variant="body" color={theme.textPrimary}>
                                  {word.definition}
                                </ThemedText>
                              </View>
                              {word.partOfSpeech && (
                                <View style={styles.wordDetailRow}>
                                  <ThemedText variant="caption" color={theme.textMuted} style={styles.wordDetailLabel}>
                                    词性：
                                  </ThemedText>
                                  <ThemedText variant="body" color={theme.textPrimary}>
                                    {word.partOfSpeech}
                                  </ThemedText>
                                </View>
                              )}
                              {word.mnemonic && (
                                <View style={styles.wordDetailRow}>
                                  <ThemedText variant="caption" color={theme.textMuted} style={styles.wordDetailLabel}>
                                    助记句：
                                  </ThemedText>
                                  <ThemedText variant="body" color={theme.textPrimary}>
                                    {word.mnemonic}
                                  </ThemedText>
                                </View>
                              )}
                              {word.sentence && (
                                <View style={styles.wordDetailRow}>
                                  <ThemedText variant="caption" color={theme.textMuted} style={styles.wordDetailLabel}>
                                    例句：
                                  </ThemedText>
                                  <ThemedText variant="body" color={theme.textPrimary}>
                                    {word.sentence}
                                  </ThemedText>
                                </View>
                              )}
                              <View style={styles.wordDetailRow}>
                                <ThemedText variant="caption" color={theme.textMuted} style={styles.wordDetailLabel}>
                                  稳定性：
                                </ThemedText>
                                <ThemedText variant="body" color={theme.textPrimary}>
                                  {word.stability.toFixed(2)} 天
                                </ThemedText>
                              </View>
                              <View style={styles.wordDetailRow}>
                                <ThemedText variant="caption" color={theme.textMuted} style={styles.wordDetailLabel}>
                                  计划复习时间：
                                </ThemedText>
                                <ThemedText variant="body" color={theme.textPrimary}>
                                  {word.next_review ? new Date(word.next_review).toLocaleString('zh-CN') : '未设置'}
                                </ThemedText>
                              </View>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* 当前日期没有复习项目时显示的提示 */}
              {(!selectedDateStats || selectedDateStats.totalReview === 0) && (
                <View style={styles.noReviewItemsContainer}>
                  <FontAwesome6 name="calendar-xmark" size={48} color={theme.textMuted} />
                  <ThemedText variant="body" color={theme.textMuted} style={styles.noReviewItemsText}>
                    当前没有待复习项目
                  </ThemedText>
                </View>
              )}
            </ThemedView>
          ) : (
            /* 列表视图 */
            <View style={styles.listContainer}>
              {/* 天数切换 */}
              <View style={styles.daysToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.daysToggleButton,
                    listDays === '7' && { backgroundColor: theme.primary }
                  ]}
                  onPress={() => setListDays('7')}
                >
                  <ThemedText
                    variant="body"
                    color={listDays === '7' ? theme.buttonPrimaryText : theme.textMuted}
                  >
                    未来 7 天
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.daysToggleButton,
                    listDays === '30' && { backgroundColor: theme.primary }
                  ]}
                  onPress={() => setListDays('30')}
                >
                  <ThemedText
                    variant="body"
                    color={listDays === '30' ? theme.buttonPrimaryText : theme.textMuted}
                  >
                    未来 30 天
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* 列表数据 */}
              {getListData().map((stats) => {
                const date = new Date(stats.date);
                return (
                  <ThemedView key={stats.date} level="default" style={styles.dayCard}>
                    <View style={styles.dayCardHeader}>
                      <ThemedText variant="h4" color={theme.textPrimary}>
                        {formatDateDisplay(date)}
                      </ThemedText>
                      <View style={styles.badgeContainer}>
                        <View style={[styles.badge, { backgroundColor: theme.warning + '20' }]}>
                          <ThemedText variant="caption" color={theme.warning}>
                            {stats.pendingReview} 待复习
                          </ThemedText>
                        </View>
                        <View style={[styles.badge, { backgroundColor: theme.success + '20' }]}>
                          <ThemedText variant="caption" color={theme.success}>
                            {stats.completedReview} 已完成
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                    <View style={styles.completionRateContainer}>
                      <ThemedText variant="caption" color={theme.textMuted}>
                        完成率：{calculateCompletionRate(stats)}%
                      </ThemedText>
                      <View style={styles.progressBarContainer}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${calculateCompletionRate(stats)}%`, backgroundColor: theme.primary }
                          ]}
                        />
                      </View>
                    </View>
                  </ThemedView>
                );
              })}

              {getListData().length === 0 && (
                <View style={styles.emptyContainer}>
                  <FontAwesome6 name="calendar-xmark" size={64} color={theme.textMuted} />
                  <ThemedText variant="body" color={theme.textMuted}>
                    未来 {listDays} 天暂无复习计划
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* 提醒设置弹窗 */}
      <Modal
        visible={showReminderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReminderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView level="default" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>复习提醒</ThemedText>
              <TouchableOpacity onPress={() => setShowReminderModal(false)}>
                <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.switchContainer}>
                <ThemedText variant="body" color={theme.textPrimary}>开启提醒</ThemedText>
                <TouchableOpacity
                  style={[
                    styles.switch,
                    reminderEnabled && { backgroundColor: theme.primary }
                  ]}
                  onPress={() => setReminderEnabled(!reminderEnabled)}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      reminderEnabled && { transform: [{ translateX: 20 }] }
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {reminderEnabled && (
                <View style={styles.timeInputContainer}>
                  <ThemedText variant="body" color={theme.textPrimary}>提醒时间</ThemedText>
                  <TextInput
                    style={[styles.timeInput, { color: theme.textPrimary, borderColor: theme.border }]}
                    value={reminderTime}
                    onChangeText={setReminderTime}
                    placeholder="09:00"
                    maxLength={5}
                  />
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.backgroundTertiary }]}
                onPress={() => setShowReminderModal(false)}
              >
                <ThemedText variant="body" color={theme.textPrimary}>取消</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.primary }]}
                onPress={saveReminderSettings}
              >
                <ThemedText variant="body" color={theme.buttonPrimaryText}>保存</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>

      {/* 复习历史弹窗 */}
      <Modal
        visible={showHistoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView level="default" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>
                {selectedDateStats ? formatDateDisplay(selectedDate) : ''} 复习详情
              </ThemedText>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedDateStats ? (
                <View>
                  <View style={styles.historyStatsContainer}>
                    <View style={styles.historyStatItem}>
                      <ThemedText variant="h2" color={theme.textPrimary}>
                        {selectedDateStats.totalReview}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textMuted}>总单词</ThemedText>
                    </View>
                    <View style={styles.historyStatItem}>
                      <ThemedText variant="h2" color={theme.success}>
                        {selectedDateStats.completedReview}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textMuted}>已完成</ThemedText>
                    </View>
                    <View style={styles.historyStatItem}>
                      <ThemedText variant="h2" color={theme.warning}>
                        {selectedDateStats.pendingReview}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textMuted}>待复习</ThemedText>
                    </View>
                  </View>

                  <View style={styles.completionRateContainer}>
                    <ThemedText variant="body" color={theme.textPrimary}>
                      完成率：{calculateCompletionRate(selectedDateStats)}%
                    </ThemedText>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${calculateCompletionRate(selectedDateStats)}%`, backgroundColor: theme.primary }
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <ThemedText variant="body" color={theme.textMuted}>暂无数据</ThemedText>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowHistoryModal(false)}
              >
                <ThemedText variant="body" color={theme.buttonPrimaryText}>关闭</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>

      {/* 提前复习确认弹窗 */}
      <Modal
        visible={showEarlyReviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEarlyReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView level="default" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>
                提前复习提醒
              </ThemedText>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.warningContainer}>
                <FontAwesome6 name="triangle-exclamation" size={48} color="#F59E0B" />
                <ThemedText variant="body" color={theme.textPrimary} style={styles.warningTitle}>
                  提前复习会影响记忆效果
                </ThemedText>
              </View>
              
              <ThemedText variant="body" color={theme.textSecondary} style={styles.warningText}>
                根据认知心理学研究，过早复习会导致过度学习，形成记忆假象，长期记忆效果会降低15%-30%。
              </ThemedText>
              
              <ThemedText variant="body" color={theme.textSecondary} style={styles.warningText}>
                建议按系统推算的时间进行复习，以获得最佳的记忆效果。
              </ThemedText>
              
              <ThemedText variant="body" color={theme.warning} style={styles.adjustmentText}>
                系统将调整单词掌握率计算因子
              </ThemedText>
              
              {/* 词库选择列表 */}
              <View style={styles.wordbookSelectContainer}>
                <View style={styles.wordbookSelectHeader}>
                  <ThemedText variant="body" color={theme.textPrimary} style={styles.wordbookSelectTitle}>
                    选择词库
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.selectAllButton}
                    onPress={() => {
                      const dateStr = earlyReviewDate!.toISOString().split('T')[0];
                      const wordbookWordsMap = dailyWordbookPendingWords.get(dateStr) || new Map();
                      const allWordbookIds = Array.from(wordbookWordsMap.keys());
                      
                      if (selectedWordbookIds.size === allWordbookIds.length) {
                        setSelectedWordbookIds(new Set());
                      } else {
                        setSelectedWordbookIds(new Set(allWordbookIds));
                      }
                    }}
                  >
                    <ThemedText variant="body" color={theme.primary}>
                      {(() => {
                        const dateStr = earlyReviewDate!.toISOString().split('T')[0];
                        const wordbookWordsMap = dailyWordbookPendingWords.get(dateStr) || new Map();
                        const allWordbookIds = Array.from(wordbookWordsMap.keys());
                        return selectedWordbookIds.size === allWordbookIds.length ? '取消全选' : '全选';
                      })()}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
                
                {(() => {
                  const dateStr = earlyReviewDate!.toISOString().split('T')[0];
                  const wordbookWordsMap = dailyWordbookPendingWords.get(dateStr) || new Map();
                  
                  return Array.from(wordbookWordsMap.entries()).map(([wordbookId, words]) => (
                    <TouchableOpacity
                      key={wordbookId}
                      style={styles.wordbookSelectItem}
                      onPress={() => {
                        const newSelected = new Set(selectedWordbookIds);
                        if (newSelected.has(wordbookId)) {
                          newSelected.delete(wordbookId);
                        } else {
                          newSelected.add(wordbookId);
                        }
                        setSelectedWordbookIds(newSelected);
                      }}
                    >
                      <View style={styles.wordbookSelectLeft}>
                        <FontAwesome6
                          name={selectedWordbookIds.has(wordbookId) ? 'square-check' : 'square'}
                          size={20}
                          color={selectedWordbookIds.has(wordbookId) ? theme.primary : theme.textMuted}
                        />
                        <ThemedText variant="body" color={theme.textPrimary} style={styles.wordbookSelectName}>
                          {(() => {
                            const wordbook = dailyWordbookList.get(wordbookId);
                            return wordbook ? wordbook.name : `词库 ${wordbookId}`;
                          })()}
                        </ThemedText>
                      </View>
                      <ThemedText variant="caption" color={theme.textMuted} style={styles.wordbookSelectCount}>
                        {words.length} 个单词
                      </ThemedText>
                    </TouchableOpacity>
                  ));
                })()}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.backgroundTertiary }]}
                onPress={() => setShowEarlyReviewModal(false)}
              >
                <ThemedText variant="body" color={theme.textPrimary}>取消</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.primary }]}
                onPress={confirmEarlyReview}
              >
                <ThemedText variant="body" color={theme.buttonPrimaryText}>确认</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </Screen>
  );
}
