// OCR 主入口文件
// 使用 Tesseract.js 进行离线 OCR 识别

import * as FileSystem from 'expo-file-system/legacy';
import Tesseract from 'tesseract.js';
import { extractValidWords } from './ocr-common';

// 通用工具函数
export * from './ocr-common';
export type { OCRResult } from './ocr-common';

/**
 * 统一的 OCR 识别接口
 * 使用 Tesseract.js 进行离线识别
 *
 * @param imageUri 图片 URI
 * @returns OCR 识别结果
 *
 * @example
 * const result = await recognizeText(imageUri);
 * if (result.success) {
 *   console.log('识别到的文本:', result.text);
 *   console.log('识别到的行:', result.lines);
 * }
 */
export const recognizeText = async (imageUri: string) => {
  try {
    if (__DEV__) {
      console.log('[OCR] 开始识别:', imageUri);
    }

    // 读取图片为 Base64
    const base64 = await (FileSystem as any).readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // 使用 Tesseract.js 进行 OCR 识别
    const result = await Tesseract.recognize(
      `data:image/jpeg;base64,${base64}`,
      'eng', // 使用英语语言包
      {
        logger: (m) => {
          if (__DEV__ && m.status === 'recognizing text') {
            console.log(`[OCR] 识别进度: ${(m.progress * 100).toFixed(0)}%`);
          }
        },
      }
    );

    const { data } = result as any;

    // 提取文本行
    const lines: string[] = [];
    if (data.words && Array.isArray(data.words)) {
      // 从单词级别重建行
      const lineMap = new Map<number, string[]>();
      data.words.forEach((word: any) => {
        const lineIndex = Math.floor(word.bbox.y0 / 10); // 简单的行分组
        if (!lineMap.has(lineIndex)) {
          lineMap.set(lineIndex, []);
        }
        lineMap.get(lineIndex)!.push(word.text);
      });
      lineMap.forEach((words: string[]) => {
        lines.push(words.join(' '));
      });
    } else if (data.text) {
      // 如果没有详细数据，使用文本拆分
      lines.push(...data.text.split('\n').filter((line: string) => line.trim()));
    }

    if (__DEV__) {
      console.log('[OCR] 识别完成:', {
        confidence: data.confidence,
        textLength: data.text?.length || 0,
        lines: lines.length,
      });
    }

    return {
      success: true,
      text: data.text || '',
      lines,
      confidence: data.confidence || 0,
    };
  } catch (error: any) {
    console.error('[OCR] 识别失败:', error);
    return {
      success: false,
      error: error.message || 'OCR 识别失败',
    };
  }
};

// 导出别名，保持向后兼容
export { extractValidWords as extractEnglishWords };
