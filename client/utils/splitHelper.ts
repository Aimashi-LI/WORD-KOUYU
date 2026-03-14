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
 * 自动拆分算法：使用贪婪算法在编码库中找到拆分方案
 * 从左到右，尽可能找到最长的匹配编码
 * 如果开头不匹配，跳过直到找到第一个匹配
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
  const result: SplitItem[] = [];
  let currentIndex = 0;

  // 预处理编码库，建立索引
  const codeMap = new Map<string, Code>();
  codes.forEach(code => {
    codeMap.set(code.letter.toLowerCase(), code);
  });

  // 贪婪算法：从左到右查找匹配
  while (currentIndex < n) {
    let matched = false;
    let maxLength = 0;
    let matchedCode: string | null = null;

    // 从当前位置向后查找最长的匹配编码
    // 从最长的子串开始查找（优先匹配长编码）
    const maxSubstringLength = Math.min(n - currentIndex, 10); // 限制最大匹配长度，避免性能问题

    for (let length = maxSubstringLength; length >= 1; length--) {
      const substring = lowerWord.substring(currentIndex, currentIndex + length);
      if (codeMap.has(substring)) {
        maxLength = length;
        matchedCode = substring;
        matched = true;
        break; // 找到匹配，停止查找更短的
      }
    }

    if (matched && matchedCode) {
      // 找到匹配，添加到结果
      const code = codeMap.get(matchedCode);
      result.push({
        code: matchedCode,
        content: code?.chinese || ''
      });
      currentIndex += maxLength;
    } else {
      // 未找到匹配，处理未匹配部分
      const unmatchedStartIndex = currentIndex;

      // 跳过未匹配的字母，直到找到下一个匹配
      while (currentIndex < n) {
        let foundMatch = false;
        const maxSubstringLength = Math.min(n - currentIndex, 10);

        for (let length = maxSubstringLength; length >= 1; length--) {
          const substring = lowerWord.substring(currentIndex, currentIndex + length);
          if (codeMap.has(substring)) {
            foundMatch = true;
            break;
          }
        }

        if (foundMatch) {
          break; // 找到下一个匹配，停止跳过
        }

        currentIndex++; // 跳过当前字母
      }

      // 将未匹配的部分作为独立的拆分项
      if (unmatchedStartIndex < currentIndex) {
        const unmatchedPart = word.substring(unmatchedStartIndex, currentIndex);
        result.push({
          code: unmatchedPart,
          content: '' // 未匹配部分不显示含义
        });
      }
      // 继续从当前位置开始查找
    }
  }

  return result.length > 0 ? result : null;
}

/**
 * 自动填充编码含义
 */
export function autoFillMeaning(code: string, codes: Code[]): string {
  if (!code) return '';
  
  const matchedCode = codes.find(c => 
    c.letter.toLowerCase() === code.toLowerCase()
  );
  
  return matchedCode?.chinese || '';
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
 * 编码建议列表接口
 */
export interface CodeSuggestionsList {
  userInput: string;
  suggestions: Array<{
    code: string;
    completedText: string;
    matchedCode: Code;
    matchType: 'exact' | 'prefix' | 'contains';
  }>;
}

/**
 * 获取编码建议（返回前缀匹配的第一个结果，保持向后兼容）
 */
export function getCodeSuggestion(input: string, codes: Code[]): CodeSuggestion | null {
  if (!input || !codes || codes.length === 0) {
    return null;
  }

  const suggestions = getCodeSuggestionsList(input, codes);
  if (suggestions.suggestions.length === 0) {
    return null;
  }

  // 返回第一个建议（优先级最高）
  const firstSuggestion = suggestions.suggestions[0];
  return {
    userInput: input,
    completedText: firstSuggestion.completedText,
    matchedCode: firstSuggestion.matchedCode
  };
}

/**
 * 获取编码建议列表（支持多种匹配方式）
 * @param input 用户输入
 * @param codes 编码库
 * @returns 建议列表，按匹配优先级排序
 */
export function getCodeSuggestionsList(input: string, codes: Code[]): CodeSuggestionsList {
  const result: CodeSuggestionsList = {
    userInput: input,
    suggestions: []
  };

  if (!input || !codes || codes.length === 0) {
    return result;
  }

  const lowerInput = input.toLowerCase();
  const matchedSuggestions = new Map<string, Array<{ code: Code; matchType: 'exact' | 'prefix' | 'contains' }>>();

  // 遍历所有编码，查找匹配项
  for (const code of codes) {
    const lowerCode = code.letter.toLowerCase();

    // 精确匹配
    if (lowerCode === lowerInput) {
      addSuggestion(matchedSuggestions, code, 'exact');
    }
    // 前缀匹配（但不是精确匹配）
    else if (lowerCode.startsWith(lowerInput) && lowerCode !== lowerInput) {
      addSuggestion(matchedSuggestions, code, 'prefix');
    }
    // 包含匹配（前3个字符匹配时才触发）
    else if (lowerInput.length >= 3 && lowerCode.includes(lowerInput)) {
      addSuggestion(matchedSuggestions, code, 'contains');
    }
  }

  // 去重：每个编码只保留优先级最高的匹配
  const uniqueSuggestions = Array.from(matchedSuggestions.values())
    .map(matches => {
      // 优先级：exact > prefix > contains
      matches.sort((a, b) => {
        const priority = { 'exact': 3, 'prefix': 2, 'contains': 1 };
        return priority[b.matchType] - priority[a.matchType];
      });
      return matches[0];
    });

  // 按优先级和编码长度排序（优先级高的在前，同优先级短的在前）
  uniqueSuggestions.sort((a, b) => {
    const priority = { 'exact': 3, 'prefix': 2, 'contains': 1 };
    if (a.matchType !== b.matchType) {
      return priority[b.matchType] - priority[a.matchType];
    }
    // 同优先级时，短的在前
    return a.code.letter.length - b.code.letter.length;
  });

  // 限制返回数量，最多5个
  const suggestions = uniqueSuggestions.slice(0, 5).map(item => ({
    code: item.code.letter,
    completedText: item.code.letter.substring(input.length),
    matchedCode: item.code,
    matchType: item.matchType
  }));

  return {
    userInput: input,
    suggestions
  };
}

/**
 * 辅助函数：添加建议到 Map
 */
function addSuggestion(
  map: Map<string, Array<{ code: Code; matchType: 'exact' | 'prefix' | 'contains' }>>,
  code: Code,
  matchType: 'exact' | 'prefix' | 'contains'
) {
  const key = code.letter.toLowerCase();
  if (!map.has(key)) {
    map.set(key, []);
  }
  map.get(key)!.push({ code, matchType });
}
