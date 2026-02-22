import { getDatabase } from './index';
import { Word } from './types';

export interface ReviewPlanItem {
  date: string;  // ISO 格式的日期
  dateLabel: string;  // 显示的日期标签，如 "今天"、"明天"、"2024-01-15"
  timeLabel: string;  // 显示的时间标签，如 "10:30"
  fullDateTime: string;  // 完整的日期时间显示，如 "今天 10:30"
  words: Word[];  // 当天需要复习的单词
  wordbooks: Array<{  // 按词库分组的单词
    wordbookId: number;
    wordbookName: string;
    words: Word[];
    count: number;
  }>;
  count: number;  // 单词数量
}

export interface ReviewStats {
  totalWords: number;
  masteredWords: number;
  pendingWords: number;
  masteryRate: number;  // 掌握率（百分比）
  averageStability: number;  // 平均稳定性
  totalReviewCount: number;  // 总复习次数
}

export interface ReviewGroup {
  label: string;  // 分组标签，如 "今天待复习"、"本周待复习"
  items: ReviewPlanItem[];  // 该分组下的复习计划项
  totalWords: number;  // 该分组的总单词数
}

/**
 * 获取复习计划
 * @param daysAhead 预览多少天的复习计划，默认 7 天
 * @returns 按日期分组的复习计划
 */
export async function getReviewPlan(daysAhead: number = 7): Promise<ReviewPlanItem[]> {
  const db = getDatabase();
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(now.getDate() + daysAhead);
  
  // 获取所有有复习计划的单词（next_review 不为空），并关联词库信息
  const rows = await db.getAllAsync<any>(
    `SELECT w.*, ww.wordbook_id, wb.name as wordbook_name
     FROM words w
     INNER JOIN wordbook_words ww ON w.id = ww.word_id
     INNER JOIN wordbooks wb ON ww.wordbook_id = wb.id
     WHERE w.next_review IS NOT NULL 
     AND w.next_review <= ?
     ORDER BY w.next_review ASC, wb.name ASC`,
    [endDate.toISOString()]
  );
  
  console.log('[getReviewPlan] 获取到的单词数量:', rows.length);
  
  // 按日期分组
  const planMap = new Map<string, Array<{ word: Word; wordbookId: number; wordbookName: string }>>();
  
  rows.forEach(row => {
    const word = mapToWord(row);
    const reviewDate = word.next_review ? new Date(word.next_review) : null;
    
    if (reviewDate) {
      const dateKey = reviewDate.toISOString().split('T')[0];  // YYYY-MM-DD
      
      if (!planMap.has(dateKey)) {
        planMap.set(dateKey, []);
      }
      
      planMap.get(dateKey)!.push({
        word,
        wordbookId: row.wordbook_id,
        wordbookName: row.wordbook_name
      });
    }
  });
  
  // 转换为数组并排序
  const plan: ReviewPlanItem[] = Array.from(planMap.entries())
    .map(([date, wordbookItems]) => {
      const dateObj = new Date(date + 'T09:00:00');  // 默认上午 9 点
      const { dateLabel, timeLabel, fullDateTime } = getDateTimeLabel(dateObj, now);
      
      const words = wordbookItems.map(item => item.word);
      
      // 按词库分组单词
      const wordbookMap = new Map<number, { wordbookId: number; wordbookName: string; words: Word[] }>();
      wordbookItems.forEach(item => {
        if (!wordbookMap.has(item.wordbookId)) {
          wordbookMap.set(item.wordbookId, {
            wordbookId: item.wordbookId,
            wordbookName: item.wordbookName,
            words: []
          });
        }
        wordbookMap.get(item.wordbookId)!.words.push(item.word);
      });
      
      const wordbooks = Array.from(wordbookMap.values()).map(wb => ({
        wordbookId: wb.wordbookId,
        wordbookName: wb.wordbookName,
        words: wb.words,
        count: wb.words.length
      }));
      
      return {
        date,
        dateLabel,
        timeLabel,
        fullDateTime,
        words,
        wordbooks,
        count: words.length
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  
  console.log('[getReviewPlan] 复习计划分组数:', plan.length);
  return plan;
}

/**
 * 按时间分组获取复习计划
 * @returns 按今天、明天、本周、下周分组的复习计划
 */
export async function getReviewPlanGrouped(): Promise<ReviewGroup[]> {
  const plan = await getReviewPlan(14);  // 获取 14 天的复习计划
  const now = new Date();
  
  // 获取本周和下周的日期范围
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const thisWeekEnd = new Date(today);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + (7 - today.getDay()));
  thisWeekEnd.setHours(23, 59, 59, 999);
  
  const nextWeekEnd = new Date(thisWeekEnd);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
  
  // 分组
  const groups: ReviewGroup[] = [
    {
      label: '今天待复习',
      items: [],
      totalWords: 0
    },
    {
      label: '明天待复习',
      items: [],
      totalWords: 0
    },
    {
      label: '本周待复习',
      items: [],
      totalWords: 0
    },
    {
      label: '下周待复习',
      items: [],
      totalWords: 0
    },
    {
      label: '后续计划',
      items: [],
      totalWords: 0
    }
  ];
  
  plan.forEach(item => {
    const itemDate = new Date(item.date);
    itemDate.setHours(0, 0, 0, 0);
    
    if (itemDate.getTime() === today.getTime()) {
      // 今天
      groups[0].items.push(item);
      groups[0].totalWords += item.count;
    } else if (itemDate.getTime() === tomorrow.getTime()) {
      // 明天
      groups[1].items.push(item);
      groups[1].totalWords += item.count;
    } else if (itemDate.getTime() > tomorrow.getTime() && itemDate.getTime() <= thisWeekEnd.getTime()) {
      // 本周
      groups[2].items.push(item);
      groups[2].totalWords += item.count;
    } else if (itemDate.getTime() > thisWeekEnd.getTime() && itemDate.getTime() <= nextWeekEnd.getTime()) {
      // 下周
      groups[3].items.push(item);
      groups[3].totalWords += item.count;
    } else {
      // 后续
      groups[4].items.push(item);
      groups[4].totalWords += item.count;
    }
  });
  
  // 过滤掉没有单词的分组
  return groups.filter(g => g.totalWords > 0);
}

/**
 * 获取复习统计信息
 * @returns 复习统计数据
 */
export async function getReviewStats(): Promise<ReviewStats> {
  const db = getDatabase();
  
  // 获取总单词数
  const totalRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM words');
  const totalWords = totalRow?.count || 0;
  
  // 获取已掌握单词数
  const masteredRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM words WHERE is_mastered = 1'
  );
  const masteredWords = masteredRow?.count || 0;
  
  // 获取待复习单词数（有 next_review 且在未来的）
  const pendingRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM words 
     WHERE is_mastered = 0 
     AND next_review IS NOT NULL`
  );
  const pendingWords = pendingRow?.count || 0;
  
  // 计算掌握率
  const masteryRate = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;
  
  // 计算平均稳定性
  const stabilityRow = await db.getFirstAsync<{ avg_stability: number }>(
    `SELECT AVG(stability) as avg_stability FROM words WHERE stability IS NOT NULL`
  );
  const averageStability = stabilityRow?.avg_stability || 0;
  
  // 获取总复习次数（从 review_logs 表）
  const reviewCountRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM review_logs'
  );
  const totalReviewCount = reviewCountRow?.count || 0;
  
  return {
    totalWords,
    masteredWords,
    pendingWords,
    masteryRate,
    averageStability,
    totalReviewCount
  };
}

/**
 * 获取指定日期范围内的待复习单词
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 待复习的单词列表
 */
export async function getWordsByDateRange(startDate: Date, endDate: Date): Promise<Word[]> {
  const db = getDatabase();
  
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM words 
     WHERE next_review >= ? 
     AND next_review <= ? 
     ORDER BY next_review ASC`,
    [startDate.toISOString(), endDate.toISOString()]
  );
  
  return rows.map(mapToWord);
}

/**
 * 获取日期标签
 * @param dateStr ISO 格式的日期字符串
 * @param now 当前日期
 * @returns 日期标签
 */
function getDateLabel(dateStr: string, now: Date): string {
  const date = new Date(dateStr);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateDate = new Date(date);
  dateDate.setHours(0, 0, 0, 0);

  if (dateDate.getTime() === today.getTime()) {
    return '今天';
  } else if (dateDate.getTime() === tomorrow.getTime()) {
    return '明天';
  } else {
    // 返回格式化的日期，如 "12月25日 周三"
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    return `${month}月${day}日 ${weekDay}`;
  }
}

/**
 * 获取日期时间标签（带具体时间）
 * @param date 日期对象
 * @param now 当前日期
 * @returns 日期时间标签信息
 */
function getDateTimeLabel(date: Date, now: Date): {
  dateLabel: string;
  timeLabel: string;
  fullDateTime: string;
} {
  const dateLabel = getDateLabel(date.toISOString().split('T')[0], now);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeLabel = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const fullDateTime = `${dateLabel} ${timeLabel}`;
  
  return {
    dateLabel,
    timeLabel,
    fullDateTime
  };
}

/**
 * 映射数据库行到 Word 对象
 */
function mapToWord(row: any): Word {
  return {
    id: row.id,
    word: row.word,
    phonetic: row.phonetic,
    definition: row.definition,
    partOfSpeech: row.partOfSpeech,
    split: row.split,
    mnemonic: row.mnemonic,
    sentence: row.sentence,
    difficulty: row.difficulty || 0,
    stability: row.stability || 0,
    last_review: row.last_review,
    next_review: row.next_review,
    avg_response_time: row.avg_response_time || 0,
    is_mastered: row.is_mastered || 0,
    created_at: row.created_at
  };
}
