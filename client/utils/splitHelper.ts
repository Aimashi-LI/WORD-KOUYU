import { Code } from '@/database/types';

// 拆分项接口
export interface SplitItem {
  code: string;
  content: string;
}

// 拆分历史记录
export interface SplitHistory {
  splitItems: SplitItem[];
}

/**
 * 自动拆分算法：使用动态规划在编码库中找到最佳拆分方案
 * @param word 要拆分的单词
 * @param codes 编码库
 * @returns 拆分后的数组，如果无法拆分返回 null
 */
export function autoSplitByCodeLib(word: string, codes: Code[]): SplitItem[] | null {
  if (!word || !codes || codes.length === 0) {
    return null;
  }

  const lowerWord = word.toLowerCase();
  const n = lowerWord.length;

  // dp[i] 表示到位置 i 的最少拆分段数
  const dp = Array(n + 1).fill(Infinity);
  // path[i] 记录到达位置 i 的上一个位置
  const path = Array(n + 1).fill(-1);
  
  dp[0] = 0;

  // 预处理编码库，建立索引（一个编码可能对应多个含义）
  const codeMap = new Map<string, Code[]>();
  codes.forEach(code => {
    const key = code.letter.toLowerCase();
    if (!codeMap.has(key)) {
      codeMap.set(key, []);
    }
    codeMap.get(key)!.push(code);
  });

  // 动态规划
  for (let i = 0; i < n; i++) {
    if (dp[i] === Infinity) continue;

    for (let j = i + 1; j <= n; j++) {
      const substring = lowerWord.substring(i, j);
      
      if (codeMap.has(substring)) {
        if (dp[j] > dp[i] + 1) {
          dp[j] = dp[i] + 1;
          path[j] = i;
        }
      }
    }
  }

  // 找到最远可达位置
  let maxReachableIndex = 0;
  for (let i = 1; i <= n; i++) {
    if (dp[i] !== Infinity) {
      maxReachableIndex = i;
    }
  }

  // 如果无法拆分，返回 null
  if (maxReachableIndex === 0) {
    return null;
  }

  // 回溯构建拆分结果
  const result: SplitItem[] = [];
  let currentIndex = maxReachableIndex;

  while (currentIndex > 0) {
    const prevIndex = path[currentIndex];
    if (prevIndex === -1) break;

    const code = lowerWord.substring(prevIndex, currentIndex);
    const matchedCodes = codeMap.get(code);
    
    // 如果匹配到多个含义，用逗号连接
    const content = matchedCodes
      ? matchedCodes.map(c => c.chinese).join('、')
      : '';
    
    result.push({
      code: code,
      content: content
    });

    currentIndex = prevIndex;
  }

  result.reverse();

  // 如果有剩余部分，添加到末尾
  const remainingPart = word.substring(maxReachableIndex);
  if (remainingPart.length > 0) {
    result.push({
      code: remainingPart,
      content: autoFillMeaning(remainingPart, codes)
    });
  }

  return result.length > 0 ? result : null;
}

/**
 * 自动填充编码含义
 */
export function autoFillMeaning(code: string, codes: Code[]): string {
  if (!code) return '';
  
  // 查找所有匹配的编码
  const matchedCodes = codes.filter(c => 
    c.letter.toLowerCase() === code.toLowerCase()
  );
  
  // 如果匹配到多个含义，用逗号连接
  if (matchedCodes.length > 0) {
    return matchedCodes.map(c => c.chinese).join('、');
  }
  
  return '';
}

/**
 * 执行拆分操作
 * @param code 要拆分的编码
 * @param splitIndex 拆分位置（在该字符后拆分）
 * @param codes 编码库
 * @returns 拆分后的两个项
 */
export function performSplit(code: string, splitIndex: number, codes: Code[]): [SplitItem, SplitItem] | null {
  if (!code || splitIndex <= 0 || splitIndex >= code.length) {
    return null;
  }

  const leftCode = code.substring(0, splitIndex);
  const rightCode = code.substring(splitIndex);

  const leftSplitItem: SplitItem = {
    code: leftCode,
    content: autoFillMeaning(leftCode, codes)
  };

  const rightSplitItem: SplitItem = {
    code: rightCode,
    content: autoFillMeaning(rightCode, codes)
  };

  return [leftSplitItem, rightSplitItem];
}

/**
 * 验证拆分完整性
 * @param splitItems 拆分项数组
 * @param fullWord 完整单词
 * @returns 验证结果
 */
export function validateSplitCompleteness(splitItems: SplitItem[], fullWord: string): {
  valid: boolean;
  message: string;
} {
  if (!splitItems || splitItems.length === 0) {
    return { valid: true, message: '' };
  }

  // 检查每个拆分项都有内容
  for (let i = 0; i < splitItems.length; i++) {
    const item = splitItems[i];
    if (!item.code || item.code.trim() === '') {
      continue;
    }

    if (!item.content || item.content.trim() === '') {
      return {
        valid: false,
        message: `第${i + 1}个编码 "${item.code}" 未填写含义，请填写完整`
      };
    }
  }

  // 检查拼写是否完整
  const combinedLetters = splitItems
    .filter(item => item.code && item.code.trim() !== '')
    .map(item => item.code.trim().toLowerCase())
    .join('');

  const targetWord = fullWord ? fullWord.toLowerCase() : '';

  if (combinedLetters !== targetWord) {
    return {
      valid: false,
      message: `拆分拼写错误：${combinedLetters} ≠ ${fullWord}，请检查拆分的字母是否正确`
    };
  }

  return { valid: true, message: '' };
}

/**
 * 将拆分项数组转换为字符串格式
 * 格式：code1,content1。code2,content2
 */
export function convertSplitItemsToString(splitItems: SplitItem[]): string {
  const validItems = splitItems.filter(item => 
    item.code.trim() && item.content.trim()
  );
  
  return validItems
    .map(item => `${item.code.trim()},${item.content.trim()}`)
    .join('。');
}

/**
 * 格式化拆分字符串用于展示
 * 将存储格式（code1,content1。code2,content2）转换为展示格式（每个拆分组独占一行）
 * @param splitStr 存储格式的拆分字符串
 * @returns 展示格式的拆分字符串
 */
export function formatSplitStringForDisplay(splitStr: string): string {
  if (!splitStr || !splitStr.trim()) {
    return '';
  }

  try {
    // 使用 '。' 分割每一组
    const groups = splitStr.split('。').filter(g => g.trim());
    
    // 对每一组，使用 ',' 分割英文和中文，然后用 '-' 连接
    const formattedGroups = groups.map(group => {
      const parts = group.split(',');
      if (parts.length >= 2) {
        const code = parts[0].trim();
        const content = parts.slice(1).join(',').trim();
        return `${code}-${content}`;
      } else if (parts.length === 1) {
        // 如果只有一部分，直接返回（容错处理）
        return parts[0].trim();
      }
      return '';
    });

    // 使用换行符连接所有组，实现分排展示
    return formattedGroups.filter(g => g).join('\n');
  } catch (error) {
    console.error('格式化拆分字符串失败:', error);
    return splitStr; // 格式化失败时返回原字符串
  }
}

/**
 * 解析拆分字符串为拆分项数组
 */
export function parseSplitString(splitStr: string): SplitItem[] {
  if (!splitStr || !splitStr.trim()) {
    return [{ code: '', content: '' }];
  }

  try {
    const groups = splitStr.split('。').filter(g => g.trim());
    const splitItems = groups.map(group => {
      const parts = group.split(',');
      if (parts.length >= 2) {
        return {
          code: parts[0].trim(),
          content: parts.slice(1).join(',').trim()
        };
      } else {
        return { code: '', content: '' };
      }
    });

    const validItems = splitItems.filter(item => 
      item.code.trim() || item.content.trim()
    );

    return validItems.length > 0 ? validItems : [{ code: '', content: '' }];
  } catch (error) {
    console.error('解析拆分字符串失败:', error);
    return [{ code: '', content: '' }];
  }
}

/**
 * 编码建议接口
 */
export interface CodeSuggestion {
  userInput: string;
  completedText: string;
  matchedCode: Code;
}

/**
 * 获取编码建议
 */
export function getCodeSuggestion(input: string, codes: Code[]): CodeSuggestion | null {
  if (!input || !codes || codes.length === 0) {
    return null;
  }

  const lowerInput = input.toLowerCase();
  
  // 查找以输入开头的编码
  const matchedCode = codes.find(code =>
    code.letter.toLowerCase().startsWith(lowerInput)
  );

  if (matchedCode && input.length > 0) {
    // 查找该编码对应的所有含义
    const allMeanings = codes
      .filter(c => c.letter.toLowerCase() === matchedCode.letter.toLowerCase())
      .map(c => c.chinese)
      .join('、');
    
    return {
      userInput: input,
      completedText: matchedCode.letter.substring(input.length),
      matchedCode: {
        ...matchedCode,
        chinese: allMeanings
      }
    };
  }

  return null;
}
