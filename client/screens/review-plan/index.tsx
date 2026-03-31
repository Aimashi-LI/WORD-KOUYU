import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Dimensions, ActivityIndicator } from 'react-native';
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
import { updateWord } from '@/database/wordDao';
import { calculateNextInterval } from '@/algorithm/fsrs';
import { Word } from '@/database/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAI, ReviewAnalysisResponse } from '@/hooks/useAI';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 统计数据类型
interface DailyStats {
  date: string;
  totalReview: number;
  completedReview: number;
  pendingReview: number;
}

// AI复习计划项（日历显示用）
interface AICalendarItem {
  wordId: number;
  word: string;
  definition?: string;
  priority: string;
  reason: string;
  suggestedTime: string;
  expectedRetention: number;
  reviewStrategy: string;
  suggestedDate: string; // 解析后的日期字符串 YYYY-MM-DD
}

export default function ReviewPlanScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { isConfigured, generateReviewAnalysis } = useAI();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyStats, setDailyStats] = useState<Map<string, DailyStats>>(new Map());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [listDays, setListDays] = useState<'7' | '30'>('7');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [bestReviewTime, setBestReviewTime] = useState('09:00');
  const [loading, setLoading] = useState(true);
  const [showEarlyReviewModal, setShowEarlyReviewModal] = useState(false);

  // 新增：存储每个日期的待复习单词列表
  const [dailyPendingWords, setDailyPendingWords] = useState<Map<string, Word[]>>(new Map());
  
  // 新增：控制单词详情展开的状态
  const [expandedWordId, setExpandedWordId] = useState<number | null>(null);

  // AI分析相关状态
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiCalendarItems, setAiCalendarItems] = useState<Map<string, AICalendarItem[]>>(new Map()); // 按日期分组的AI建议
  const [aiAnalysisResult, setAiAnalysisResult] = useState<ReviewAnalysisResponse | null>(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false); // 是否显示AI分析结果

  // 加载复习数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[ReviewPlan] ========== loadData 开始 ==========');
      await initDatabase();
      const wordbooks = await getAllWordbooks();
      console.log('[ReviewPlan] 获取到词库列表:', wordbooks);

      // 获取所有单词的复习信息
      const allWords: Word[] = [];
      for (const wb of wordbooks) {
        const words = await getWordsInWordbook(wb.id);
        console.log(`[ReviewPlan] 词库 ${wb.id} (${wb.name}) 包含 ${words.length} 个单词`);
        allWords.push(...words);
      }

      // 去重：避免同一个单词在多个词库中重复出现
      const uniqueWordsMap = new Map<number, Word>();
      allWords.forEach((word) => {
        uniqueWordsMap.set(word.id, word);
      });
      const uniqueWords = Array.from(uniqueWordsMap.values());

      console.log('[ReviewPlan] 去重前单词数:', allWords.length, '去重后单词数:', uniqueWords.length);

      // 检查单词的 next_review 字段
      const wordsWithNextReview = uniqueWords.filter(w => w.next_review !== null && w.next_review !== undefined);
      const wordsWithoutNextReview = uniqueWords.filter(w => w.next_review === null || w.next_review === undefined);

      console.log('[ReviewPlan] 有 next_review 的单词数:', wordsWithNextReview.length);
      console.log('[ReviewPlan] 没有 next_review 的单词数:', wordsWithoutNextReview.length);

      if (wordsWithoutNextReview.length > 0) {
        console.log('[ReviewPlan] 没有 next_review 的单词:', wordsWithoutNextReview.map(w => `${w.word} (ID: ${w.id})`).join(', '));

        // 修复没有 next_review 的单词
        const now = new Date();

        for (const word of wordsWithoutNextReview) {
          // 为新单词设置初始的 next_review（10分钟后）
          const nextReviewDate = new Date(now);
          nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 10);
          const nextReview = nextReviewDate.toISOString();

          // 如果单词没有 last_review，设置为创建时间
          const lastReview = word.last_review || word.created_at || now.toISOString();

          await updateWord(word.id, {
            last_review: lastReview,
            next_review: nextReview,
          });

          console.log(`[ReviewPlan] 修复单词: ${word.word} (ID: ${word.id}), next_review: ${nextReview}`);
        }

        console.log(`[ReviewPlan] 修复完成，共修复 ${wordsWithoutNextReview.length} 个单词`);

        // 重新加载单词列表
        const updatedWords: Word[] = [];
        for (const wb of wordbooks) {
          const words = await getWordsInWordbook(wb.id);
          updatedWords.push(...words);
        }

        // 去重
        const updatedUniqueWordsMap = new Map<number, Word>();
        updatedWords.forEach((word) => {
          updatedUniqueWordsMap.set(word.id, word);
        });
        uniqueWords.length = 0;
        uniqueWords.push(...Array.from(updatedUniqueWordsMap.values()));

        console.log('[ReviewPlan] 重新加载后，所有单词都有 next_review');
      }

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
      // 为每个日期维护一个已添加单词ID的Set，确保每个单词在每个日期只出现一次
      const dateProcessedWordIds = new Map<string, Set<number>>();

      // 创建新的 Map 来存储待复习单词（避免累积）
      const pendingWordsMap = new Map<string, Word[]>();

      uniqueWords.forEach((word) => {
        if (word.next_review) {
          const reviewDate = new Date(word.next_review);
          reviewDate.setHours(0, 0, 0, 0);
          const dateStr = reviewDate.toISOString().split('T')[0];

          if (statsMap.has(dateStr)) {
            const stats = statsMap.get(dateStr)!;
            stats.totalReview++;

            if (word.is_mastered === 1) {
              stats.completedReview++;
            } else {
              stats.pendingReview++;

              // 添加到待复习单词列表（确保唯一性）
              // 确保 pendingWordsMap 和 dateProcessedWordIds 都已初始化
              if (!pendingWordsMap.has(dateStr)) {
                pendingWordsMap.set(dateStr, []);
              }
              if (!dateProcessedWordIds.has(dateStr)) {
                dateProcessedWordIds.set(dateStr, new Set());
              }

              // 获取或创建 processedIds
              let processedIds = dateProcessedWordIds.get(dateStr);
              if (!processedIds) {
                processedIds = new Set<number>();
                dateProcessedWordIds.set(dateStr, processedIds);
              }

              if (!processedIds.has(word.id)) {
                processedIds.add(word.id);
                pendingWordsMap.get(dateStr)!.push(word);
                console.log(`[ReviewPlan] 添加单词到 ${dateStr}: ${word.word} (ID: ${word.id})`);
              } else {
                console.log(`[ReviewPlan] 跳过重复单词 ${dateStr}: ${word.word} (ID: ${word.id})`);
              }
            }
          }
        }
      });

      setDailyStats(statsMap);

      // 统计有多少日期有待复习单词
      let datesWithPendingWords = 0;
      let totalPendingWords = 0;
      pendingWordsMap.forEach((words, dateStr) => {
        if (words.length > 0) {
          datesWithPendingWords++;
          totalPendingWords += words.length;
          console.log(`[ReviewPlan] 日期 ${dateStr} 有 ${words.length} 个待复习单词`);
        }
      });

      console.log(`[ReviewPlan] 共有 ${datesWithPendingWords} 个日期有待复习单词，总计 ${totalPendingWords} 个单词`);

      // 检查 pendingWordsMap 中是否有重复
      pendingWordsMap.forEach((words, dateStr) => {
        const wordIdSet = new Set<number>();
        const duplicateIds: number[] = [];
        words.forEach((word) => {
          if (wordIdSet.has(word.id)) {
            duplicateIds.push(word.id);
          } else {
            wordIdSet.add(word.id);
          }
        });
        if (duplicateIds.length > 0) {
          console.log(`[ReviewPlan] 日期 ${dateStr} 发现重复单词ID:`, duplicateIds);
        }
      });

      setDailyPendingWords(pendingWordsMap);

      // 模拟生成新单词的未来复习计划
      const newWords = uniqueWords.filter(w => w.review_count === 0 && w.next_review);
      console.log(`[ReviewPlan] 新单词数量: ${newWords.length}`);

      if (newWords.length > 0) {
        // 为每个新单词模拟生成未来5轮复习
        for (const word of newWords) {
          let simulatedStability = 1.0; // 初始稳定性
          let simulatedReviewCount = 1; // 已经有第1次复习（10分钟后）

          // 模拟未来5轮复习
          for (let round = 2; round <= 6; round++) {
            // 假设每次复习都得6分（满分）
            const simulatedScore = 6;
            const nextIntervalDays = calculateNextInterval(
              { ...word, stability: simulatedStability },
              simulatedScore,
              simulatedReviewCount
            );

            // 计算下次复习时间（从当前时间开始）
            const simulatedNextReview = new Date();
            simulatedNextReview.setDate(simulatedNextReview.getDate() + nextIntervalDays);
            const simulatedNextReviewDate = new Date(simulatedNextReview);
            simulatedNextReviewDate.setHours(0, 0, 0, 0);
            const simulatedDateStr = simulatedNextReviewDate.toISOString().split('T')[0];

            // 添加到统计数据
            if (statsMap.has(simulatedDateStr)) {
              const stats = statsMap.get(simulatedDateStr)!;
              stats.totalReview++;
              stats.pendingReview++;

              // 添加到待复习单词列表
              if (!pendingWordsMap.has(simulatedDateStr)) {
                pendingWordsMap.set(simulatedDateStr, []);
              }
              pendingWordsMap.get(simulatedDateStr)!.push(word);

              console.log(`[ReviewPlan] 模拟单词 ${word.word} 第 ${round} 次复习: ${simulatedDateStr} (${nextIntervalDays.toFixed(1)} 天后)`);
            }

            // 更新模拟稳定性
            if (nextIntervalDays > simulatedStability) {
              simulatedStability = nextIntervalDays;
            }
            simulatedReviewCount++;
          }
        }

        // 重新统计有多少日期有待复习单词
        let datesWithPendingWordsAfterSimulation = 0;
        let totalPendingWordsAfterSimulation = 0;
        pendingWordsMap.forEach((words, dateStr) => {
          if (words.length > 0) {
            datesWithPendingWordsAfterSimulation++;
            totalPendingWordsAfterSimulation += words.length;
          }
        });

        console.log(`[ReviewPlan] 模拟后共有 ${datesWithPendingWordsAfterSimulation} 个日期有待复习单词，总计 ${totalPendingWordsAfterSimulation} 个单词`);
      }

      setDailyPendingWords(pendingWordsMap);

      // 计算最佳复习时间（基于历史复习时间）
      await calculateBestReviewTime(allWords);

      // 加载提醒设置
      await loadReminderSettings();

      console.log('[ReviewPlan] ========== loadData 完成 ==========');
    } catch (error) {
      console.error('[ReviewPlan] 加载复习数据失败:', error);
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

  // AI分析复习计划
  const handleAIAnalysis = useCallback(async () => {
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

    setAiAnalyzing(true);
    try {
      // 获取所有单词
      await initDatabase();
      const wordbooks = await getAllWordbooks();
      const allWords: Word[] = [];
      for (const wb of wordbooks) {
        const words = await getWordsInWordbook(wb.id);
        allWords.push(...words);
      }

      if (allWords.length === 0) {
        Alert.alert('提示', '没有单词可以分析');
        return;
      }

      // 去重
      const uniqueWordsMap = new Map<number, Word>();
      allWords.forEach((word) => {
        uniqueWordsMap.set(word.id, word);
      });
      const uniqueWords = Array.from(uniqueWordsMap.values());

      // 计算每个单词的可提取性
      const now = new Date();
      const wordsWithAnalysis = uniqueWords.map(w => {
        const lastReview = w.last_review ? new Date(w.last_review) : null;
        
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
          lastScore: undefined,
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
        setAiAnalysisResult(result);
        
        // 解析AI建议的复习时间，按日期分组
        const calendarItemsMap = new Map<string, AICalendarItem[]>();
        
        result.reviewPlan.forEach(item => {
          // 解析建议的复习时间
          const suggestedDate = parseSuggestedTime(item.suggestedTime);
          const dateStr = suggestedDate.toISOString().split('T')[0];
          
          if (!calendarItemsMap.has(dateStr)) {
            calendarItemsMap.set(dateStr, []);
          }
          
          calendarItemsMap.get(dateStr)!.push({
            wordId: item.wordId,
            word: item.word,
            definition: wordsWithAnalysis.find(w => w.id === item.wordId)?.definition,
            priority: item.priority,
            reason: item.reason,
            suggestedTime: item.suggestedTime,
            expectedRetention: item.expectedRetention,
            reviewStrategy: item.reviewStrategy,
            suggestedDate: dateStr,
          });
        });
        
        setAiCalendarItems(calendarItemsMap);
        setShowAIAnalysis(true);
        
        // 更新统计数据以显示AI建议
        updateStatsWithAIPlan(calendarItemsMap);
      }
    } catch (error) {
      console.error('AI 分析失败:', error);
      Alert.alert('错误', 'AI 分析失败，请重试');
    } finally {
      setAiAnalyzing(false);
    }
  }, [isConfigured, generateReviewAnalysis, router]);

  // 解析AI建议的时间字符串为Date对象
  const parseSuggestedTime = (timeStr: string): Date => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 常见格式解析
    if (timeStr.includes('今天')) {
      // 今天14:00 -> 今天
      return today;
    } else if (timeStr.includes('明天')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    } else if (timeStr.includes('后天')) {
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      return dayAfter;
    } else if (timeStr.match(/\d+天后/)) {
      // "3天后" 格式
      const days = parseInt(timeStr.match(/(\d+)天后/)?.[1] || '1');
      const date = new Date(today);
      date.setDate(date.getDate() + days);
      return date;
    } else if (timeStr.match(/\d{4}-\d{2}-\d{2}/)) {
      // "2024-01-15" 格式
      return new Date(timeStr);
    } else if (timeStr.match(/\d+月\d+日/)) {
      // "1月15日" 格式
      const match = timeStr.match(/(\d+)月(\d+)日/);
      if (match) {
        const month = parseInt(match[1]) - 1;
        const day = parseInt(match[2]);
        const date = new Date(now.getFullYear(), month, day);
        // 如果日期已过，则认为是明年
        if (date < today) {
          date.setFullYear(date.getFullYear() + 1);
        }
        return date;
      }
    } else if (timeStr.match(/下周[一二三四五六日]/)) {
      // "下周一" 格式
      const weekDays: { [key: string]: number } = { '日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
      const day = timeStr.match(/下周([一二三四五六日])/)?.[1] || '一';
      const targetDay = weekDays[day];
      const date = new Date(today);
      const currentDay = date.getDay();
      const daysUntilNext = (7 - currentDay + targetDay) % 7 || 7;
      date.setDate(date.getDate() + daysUntilNext);
      return date;
    }
    
    // 默认返回今天
    return today;
  };

  // 使用AI计划更新统计数据
  const updateStatsWithAIPlan = (calendarItemsMap: Map<string, AICalendarItem[]>) => {
    const newStats = new Map<string, DailyStats>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 初始化未来60天
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      newStats.set(dateStr, {
        date: dateStr,
        totalReview: 0,
        completedReview: 0,
        pendingReview: 0,
      });
    }

    // 根据AI建议填充统计数据
    calendarItemsMap.forEach((items, dateStr) => {
      if (newStats.has(dateStr)) {
        const stats = newStats.get(dateStr)!;
        stats.totalReview = items.length;
        stats.pendingReview = items.length;
      }
    });

    setDailyStats(newStats);
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

  // 获取指定日期的AI建议复习项
  const getAIItemsForDate = (date: Date): AICalendarItem[] => {
    const dateStr = date.toISOString().split('T')[0];
    return aiCalendarItems.get(dateStr) || [];
  };

  // 获取指定日期的待复习单词列表（优先返回AI建议）
  const getPendingWordsForDate = (date: Date) => {
    // 如果显示AI分析结果，返回AI建议的单词
    if (showAIAnalysis) {
      const aiItems = getAIItemsForDate(date);
      // 将AI建议项转换为Word格式（简化版，只包含必要字段）
      // 使用 unknown 中转避免类型检查错误
      return aiItems.map(item => ({
        id: item.wordId,
        word: item.word,
        definition: item.definition || '',
        phonetic: '',
        partOfSpeech: '',
        meaning: item.definition || '',
        difficulty: 0.5,
        stability: 1,
        avg_response_time: 0,
        is_mastered: 0,
        review_count: 0,
        created_at: new Date().toISOString(),
      })) as unknown as Word[];
    }

    // 否则返回原来的待复习单词
    const dateStr = date.toISOString().split('T')[0];
    const words = dailyPendingWords.get(dateStr) || [];

    // 防御性去重：确保返回的列表中没有重复的单词ID
    const uniqueWordsMap = new Map<number, Word>();
    words.forEach((word) => {
      uniqueWordsMap.set(word.id, word);
    });
    return Array.from(uniqueWordsMap.values());
  };

  // 提前复习
  const startEarlyReview = () => {
    const pendingWords = getPendingWordsForDate(selectedDate);
    if (pendingWords.length === 0) {
      Alert.alert('提示', '当前没有待复习的单词');
      return;
    }

    // 显示提前复习提醒弹窗
    setShowEarlyReviewModal(true);
  };

  // 确认提前复习
  const confirmEarlyReview = () => {
    const pendingWords = getPendingWordsForDate(selectedDate);

    console.log('[ReviewPlan] 待复习单词列表（去重前）:', pendingWords.map(w => `${w.word}(${w.id})`).join(', '));

    // 确保单词不重复（防御性编程）
    const uniqueWordsMap = new Map<number, Word>();
    pendingWords.forEach((word) => {
      uniqueWordsMap.set(word.id, word);
    });
    const uniqueWords = Array.from(uniqueWordsMap.values());

    console.log('[ReviewPlan] 待复习单词列表（去重后）:', uniqueWords.map(w => `${w.word}(${w.id})`).join(', '));

    // 将单词ID列表转换为JSON字符串传递
    const wordIds = uniqueWords.map(w => w.id).join(',');

    // 关闭弹窗并跳转到复习详情页面
    setShowEarlyReviewModal(false);
    router.push('/review-detail', { earlyReviewWords: wordIds });
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

  // 切换月份
  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  // 选择日期
  const onDayPress = (date: Date) => {
    setSelectedDate(date);
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
          <View style={styles.predictionNoticeContainer}>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.predictionNoticeText}>
              除当天复习时间节点外其余时间节点均为预测节点，实际复习节点根据上一次复习结果实时调整
            </ThemedText>
          </View>
        </ThemedView>

        {/* AI 分析按钮 */}
        <TouchableOpacity
          style={[styles.aiAnalysisButton, { backgroundColor: theme.primary }]}
          onPress={handleAIAnalysis}
          disabled={aiAnalyzing}
        >
          {aiAnalyzing ? (
            <View style={styles.aiAnalysisLoading}>
              <ActivityIndicator size="small" color={theme.buttonPrimaryText} />
              <ThemedText variant="body" color={theme.buttonPrimaryText} style={styles.aiAnalysisText}>
                AI 正在分析...
              </ThemedText>
            </View>
          ) : (
            <View style={styles.aiAnalysisContent}>
              <FontAwesome6 name="brain" size={20} color={theme.buttonPrimaryText} />
              <ThemedText variant="body" color={theme.buttonPrimaryText} style={styles.aiAnalysisText}>
                {showAIAnalysis ? '重新分析复习计划' : 'AI 智能分析复习计划'}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>

        {/* AI 分析结果摘要 */}
        {showAIAnalysis && aiAnalysisResult && (
          <ThemedView level="default" style={styles.aiResultCard}>
            <View style={styles.aiResultHeader}>
              <FontAwesome6 name="chart-pie" size={20} color={theme.primary} />
              <ThemedText variant="h4" color={theme.textPrimary}>AI 分析结果</ThemedText>
            </View>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.aiResultSummary}>
              {aiAnalysisResult.analysis.summary}
            </ThemedText>
            <View style={styles.aiResultStats}>
              <View style={styles.aiResultStatItem}>
                <ThemedText variant="h3" color={theme.error}>{aiAnalysisResult.analysis.urgentCount}</ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>紧急复习</ThemedText>
              </View>
              <View style={styles.aiResultStatItem}>
                <ThemedText variant="h3" color={theme.warning}>{aiAnalysisResult.analysis.suggestedCount}</ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>建议今日复习</ThemedText>
              </View>
              <View style={styles.aiResultStatItem}>
                <ThemedText variant="h3" color={theme.primary}>{aiAnalysisResult.reviewPlan.length}</ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>总计划数</ThemedText>
              </View>
            </View>
          </ThemedView>
        )}

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
                              
                              {/* 显示AI建议信息（如果启用了AI分析） */}
                              {showAIAnalysis ? (
                                <>
                                  {(() => {
                                    const aiItem = getAIItemsForDate(selectedDate).find(item => item.wordId === word.id);
                                    if (!aiItem) return null;
                                    return (
                                      <>
                                        <View style={styles.wordDetailRow}>
                                          <ThemedText variant="caption" color={theme.textMuted} style={styles.wordDetailLabel}>
                                            AI建议时间：
                                          </ThemedText>
                                          <ThemedText variant="body" color={theme.primary}>
                                            {aiItem.suggestedTime}
                                          </ThemedText>
                                        </View>
                                        <View style={styles.wordDetailRow}>
                                          <ThemedText variant="caption" color={theme.textMuted} style={styles.wordDetailLabel}>
                                            优先级：
                                          </ThemedText>
                                          <ThemedText 
                                            variant="body" 
                                            color={
                                              aiItem.priority === 'urgent' ? theme.error :
                                              aiItem.priority === 'high' ? theme.warning :
                                              aiItem.priority === 'medium' ? theme.primary : theme.textMuted
                                            }
                                          >
                                            {aiItem.priority === 'urgent' ? '紧急' :
                                             aiItem.priority === 'high' ? '高' :
                                             aiItem.priority === 'medium' ? '中' : '低'}
                                          </ThemedText>
                                        </View>
                                        <View style={styles.wordDetailRow}>
                                          <ThemedText variant="caption" color={theme.textMuted} style={styles.wordDetailLabel}>
                                            复习原因：
                                          </ThemedText>
                                          <ThemedText variant="body" color={theme.textPrimary}>
                                            {aiItem.reason}
                                          </ThemedText>
                                        </View>
                                        <View style={styles.wordDetailRow}>
                                          <ThemedText variant="caption" color={theme.textMuted} style={styles.wordDetailLabel}>
                                            复习策略：
                                          </ThemedText>
                                          <ThemedText variant="body" color={theme.textPrimary}>
                                            {aiItem.reviewStrategy}
                                          </ThemedText>
                                        </View>
                                      </>
                                    );
                                  })()}
                                </>
                              ) : (
                                <>
                                  {/* 原来的显示逻辑（未启用AI分析时） */}
                                  <View style={styles.wordDetailRow}>
                                    <ThemedText variant="caption" color={theme.textMuted} style={styles.wordDetailLabel}>
                                      稳定性：
                                    </ThemedText>
                                    <ThemedText variant="body" color={theme.textPrimary}>
                                      {word.stability?.toFixed(2) || '0.00'} 天
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
                                </>
                              )}
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

      {/* 提前复习提醒弹窗 */}
      <Modal
        visible={showEarlyReviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEarlyReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView level="default" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>提前复习提醒</ThemedText>
              <TouchableOpacity onPress={() => setShowEarlyReviewModal(false)}>
                <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.warningContainer}>
                <FontAwesome6 name="triangle-exclamation" size={32} color={theme.warning} />
                <ThemedText variant="body" color={theme.textPrimary} style={styles.warningTitle}>
                  提前复习会影响记忆效果
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted} style={styles.warningText}>
                  根据记忆科学原理，过早复习可能影响长期记忆效果。如果继续复习，系统将调整单词掌握率的计算因子，以更准确地反映您的学习进度。
                </ThemedText>
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
                <ThemedText variant="body" color={theme.buttonPrimaryText}>确认继续</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </Screen>
  );
}
