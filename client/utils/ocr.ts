// OCR 主入口文件
// 使用 react-native-mlkit-ocr (基于 Google ML Kit) 进行离线 OCR 识别

import MLKit from 'react-native-mlkit-ocr';
import { extractValidWords } from './ocr-common';

// 通用工具函数
export * from './ocr-common';
export type { OCRResult } from './ocr-common';

/**
 * 统一的 OCR 识别接口
 * 使用 react-native-mlkit-ocr 进行离线识别
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

    // 使用 react-native-mlkit-ocr 进行 OCR 识别
    const result = await MLKit.detectFromUri(imageUri);

    if (__DEV__) {
      console.log('[OCR] 识别完成:', {
        blocks: result.length,
      });
    }

    // 提取所有文本行
    const lines: string[] = [];
    const allText: string[] = [];

    result.forEach((block) => {
      allText.push(block.text);
      block.lines.forEach((line) => {
        lines.push(line.text);
        line.elements.forEach((element) => {
          allText.push(element.text);
        });
      });
    });

    if (__DEV__) {
      console.log('[OCR] 提取结果:', {
        textLength: allText.join(' ').length,
        lines: lines.length,
      });
    }

    return {
      success: true,
      text: allText.join(' '),
      lines,
      confidence: 95, // ML Kit 的准确率通常在 90-95%
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
