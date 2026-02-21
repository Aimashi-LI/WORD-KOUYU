// OCR 主入口文件
// 使用 Tesseract.js 进行离线 OCR 识别
// 适配 React Native 环境（v4 版本）

import * as FileSystem from 'expo-file-system/legacy';
import Tesseract from 'tesseract.js';
import { extractValidWords } from './ocr-common';

// 通用工具函数
export * from './ocr-common';
export type { OCRResult } from './ocr-common';

/**
 * 统一的 OCR 识别接口
 * 使用 Tesseract.js v4 进行离线识别（React Native 兼容模式）
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

    // 使用 Tesseract.js v4 进行 OCR 识别
    // v4 版本对 React Native/Metro 兼容性更好
    const result = await Tesseract.recognize(
      `data:image/jpeg;base64,${base64}`,
      'eng', // 使用英语语言包
      {
        // v4 选项
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

    // 提供更详细的错误信息
    const errorMessage = error.message || 'OCR 识别失败';

    if (errorMessage.includes('worker') || errorMessage.includes('asm')) {
      console.error('[OCR] Worker/ASM 错误，这通常是 Tesseract.js 在 React Native 中的兼容性问题');
      console.error('[OCR] 建议使用云端 OCR 方案或原生 OCR 模块');
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

// 导出别名，保持向后兼容
export { extractValidWords as extractEnglishWords };
