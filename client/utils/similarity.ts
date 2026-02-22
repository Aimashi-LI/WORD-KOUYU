/**
 * 字符串相似度计算工具
 */

/**
 * 计算两个字符串的相似度（基于编辑距离）
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 相似度分数（0-1，1表示完全相同）
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  // 转换为小写进行比较
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);
  
  // 如果其中一个为空，相似度为0
  if (maxLen === 0) return 0;
  
  // 计算编辑距离（Levenshtein距离）
  const distance = levenshteinDistance(s1, s2);
  
  // 转换为相似度分数
  return 1 - (distance / maxLen);
}

/**
 * 计算编辑距离（Levenshtein距离）
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 编辑距离
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // 创建二维数组
  const dp: number[][] = Array.from({ length: len1 + 1 }, () =>
    Array.from({ length: len2 + 1 }, () => 0)
  );
  
  // 初始化第一行和第一列
  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;
  
  // 填充DP表
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // 删除
        dp[i][j - 1] + 1,      // 插入
        dp[i - 1][j - 1] + cost // 替换
      );
    }
  }
  
  return dp[len1][len2];
}

/**
 * 计算搜索匹配分数
 * @param word 单词对象
 * @param query 搜索查询
 * @returns 匹配分数（越高表示越相关）
 */
export function calculateMatchScore(word: any, query: string): {
  score: number;
  matchType: 'exact' | 'prefix' | 'contains' | 'fuzzy';
} {
  const lowerQuery = query.toLowerCase().trim();
  const lowerWord = word.word.toLowerCase();
  const lowerDefinition = (word.definition || '').toLowerCase();
  const lowerSplit = (word.split || '').toLowerCase();
  const lowerMnemonic = (word.mnemonic || '').toLowerCase();
  
  // 1. 精确匹配 - 优先级最高
  if (lowerWord === lowerQuery) {
    return { score: 100, matchType: 'exact' };
  }
  
  // 2. 单词前缀匹配
  if (lowerWord.startsWith(lowerQuery)) {
    return { score: 80 + (50 / lowerWord.length) * lowerQuery.length, matchType: 'prefix' };
  }
  
  // 3. 释义精确包含
  if (lowerDefinition.includes(lowerQuery)) {
    // 如果释义中包含完整查询，分数较高
    return { score: 70 + (30 / lowerDefinition.length) * lowerQuery.length, matchType: 'contains' };
  }
  
  // 4. 拆分包含
  if (lowerSplit.includes(lowerQuery)) {
    return { score: 65 + (25 / lowerSplit.length) * lowerQuery.length, matchType: 'contains' };
  }
  
  // 5. 助记包含
  if (lowerMnemonic.includes(lowerQuery)) {
    return { score: 60 + (20 / lowerMnemonic.length) * lowerQuery.length, matchType: 'contains' };
  }
  
  // 6. 模糊匹配 - 使用相似度算法
  const wordSimilarity = calculateSimilarity(lowerWord, lowerQuery);
  const definitionSimilarity = calculateSimilarity(lowerDefinition, lowerQuery);
  const splitSimilarity = calculateSimilarity(lowerSplit, lowerQuery);
  
  const maxSimilarity = Math.max(wordSimilarity, definitionSimilarity, splitSimilarity);
  
  // 只返回相似度大于0.3的结果
  if (maxSimilarity > 0.3) {
    return { score: maxSimilarity * 50, matchType: 'fuzzy' };
  }
  
  return { score: 0, matchType: 'fuzzy' };
}

/**
 * 对搜索结果进行排序和过滤
 * @param results 搜索结果
 * @param query 搜索查询
 * @returns 排序后的结果
 */
export function sortAndFilterSearchResults(results: any[], query: string): any[] {
  // 计算每个结果的匹配分数
  const scoredResults = results.map(word => {
    const { score, matchType } = calculateMatchScore(word, query);
    return { ...word, score, matchType };
  });
  
  // 过滤掉分数为0的结果
  const filtered = scoredResults.filter(word => word.score > 0);
  
  // 按分数降序排序
  const sorted = filtered.sort((a, b) => b.score - a.score);
  
  // 返回前50个结果
  return sorted.slice(0, 50);
}
