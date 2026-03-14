/**
 * 字符串相似度匹配工具
 * 使用 Levenshtein 距离算法计算字符串相似度
 */

/**
 * 计算 Levenshtein 距离（编辑距离）
 * 表示将一个字符串转换为另一个字符串所需的最少单字符编辑操作数
 * 允许的操作：插入、删除、替换
 *
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @returns 编辑距离
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // 创建二维数组
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );

  // 初始化第一行和第一列
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  // 动态规划填充二维数组
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        // 字符相同，不需要编辑
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        // 字符不同，取最小编辑操作数 + 1
        dp[i][j] =
          Math.min(
            dp[i - 1][j] + 1, // 删除
            dp[i][j - 1] + 1, // 插入
            dp[i - 1][j - 1] + 1 // 替换
          );
      }
    }
  }

  return dp[m][n];
}

/**
 * 计算字符串相似度（0-1之间）
 * 基于编辑距离计算：1 - 编辑距离 / 最大长度
 *
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @returns 相似度（0-1之间，1表示完全相同）
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  const similarity = 1 - distance / maxLength;
  return Math.max(0, similarity);
}

/**
 * 计算字符串相似度（改进版）
 * 结合编辑距离和字符匹配度，更精确地衡量字符串相似性
 *
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @returns 相似度（0-1之间，1表示完全相同）
 */
export function calculateImprovedSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  // 1. 计算编辑距离相似度
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  const distanceSimilarity = 1 - distance / maxLength;

  // 2. 计算字符集合相似度（考虑字符组成）
  const set1 = new Set(str1.toLowerCase());
  const set2 = new Set(str2.toLowerCase());
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  const setSimilarity = union.size > 0 ? intersection.size / union.size : 0;

  // 3. 计算最长公共子序列相似度（考虑字符顺序）
  const lcsSimilarity = calculateLCSSimilarity(str1.toLowerCase(), str2.toLowerCase());

  // 4. 加权平均（编辑距离权重最高，因为考虑了位置和顺序）
  const weights = {
    distance: 0.5,    // 编辑距离相似度权重
    set: 0.3,         // 字符集合相似度权重
    lcs: 0.2,         // 最长公共子序列相似度权重
  };

  const improvedSimilarity =
    distanceSimilarity * weights.distance +
    setSimilarity * weights.set +
    lcsSimilarity * weights.lcs;

  return Math.max(0, Math.min(1, improvedSimilarity));
}

/**
 * 计算最长公共子序列（LCS）相似度
 * 考虑字符顺序，但不要求连续
 *
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @returns LCS相似度（0-1之间）
 */
function calculateLCSSimilarity(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // 创建二维数组
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );

  // 动态规划填充二维数组
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcsLength = dp[m][n];
  const minLength = Math.min(m, n);

  return minLength > 0 ? lcsLength / minLength : 0;
}

/**
 * 判断两个字符串是否相似（基于改进的相似度算法）
 *
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @param threshold 相似度阈值（默认0.5）
 * @returns 是否相似
 */
export function isSimilar(
  str1: string,
  str2: string,
  threshold: number = 0.5
): boolean {
  const similarity = calculateImprovedSimilarity(
    str1.toLowerCase().trim(),
    str2.toLowerCase().trim()
  );
  return similarity >= threshold;
}
