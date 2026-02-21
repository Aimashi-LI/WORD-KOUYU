/**
 * OCR 识别结果接口
 */
export interface OCRResult {
  success: boolean;
  text?: string;
  lines?: string[];
  error?: string;
  words?: Array<{
    word: string;
    phonetic?: string;
    partOfSpeech?: string;
    definition?: string;
  }>;
}

/**
 * 通用 OCR 工具函数（跨平台）
 */
export const parseOCRResult = (text: string): string[] => {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // 按行分割
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // 提取英文单词（只包含字母）
  const words: string[] = [];
  const wordRegex = /\b[a-z]{2,}\b/gi; // 至少 2 个字母
  
  for (const line of lines) {
    // 移除标点符号和特殊字符
    const cleanLine = line.replace(/[^\w\s]/g, ' ');
    const matches = cleanLine.match(wordRegex);
    
    if (matches) {
      words.push(...matches);
    }
  }
  
  // 去重（保留原始顺序）
  const uniqueWords: string[] = [];
  const seen = new Set<string>();
  
  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (!seen.has(lowerWord)) {
      seen.add(lowerWord);
      uniqueWords.push(word); // 保留原始大小写
    }
  }
  
  return uniqueWords;
};

/**
 * 验证单词是否有效
 */
export const isValidWord = (word: string): boolean => {
  if (word.length < 2) return false;
  if (!/^[a-z]+$/i.test(word)) return false;
  return true;
};

/**
 * 从 OCR 结果中提取有效的英文单词
 */
export const extractValidWords = (ocrResult: OCRResult): string[] => {
  if (!ocrResult.success || !ocrResult.text) {
    return [];
  }
  
  const words = parseOCRResult(ocrResult.text);
  return words.filter(word => isValidWord(word));
};
