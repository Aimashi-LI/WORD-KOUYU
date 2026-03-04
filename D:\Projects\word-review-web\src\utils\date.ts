/**
 * 格式化日期为本地字符串
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 格式化日期为简短格式
 */
export const formatDateShort = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * 获取今天的开始时间
 */
export const getTodayStart = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/**
 * 检查日期是否是今天
 */
export const isToday = (date: string | Date): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = getTodayStart();
  return d >= today && d < new Date(today.getTime() + 24 * 60 * 60 * 1000);
};

/**
 * 计算两个日期之间的天数差
 */
export const daysBetween = (date1: string | Date, date2: string | Date): number => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return Math.floor((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000));
};
