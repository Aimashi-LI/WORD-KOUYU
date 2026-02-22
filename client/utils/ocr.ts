// OCR 主入口文件
// 使用 react-native-tesseract-ocr 进行本地 OCR 识别
// 完全离线使用，首次需下载语言包（约 10MB）

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { extractValidWords } from './ocr-common';
import RnTesseractOcr from 'react-native-tesseract-ocr';

// 通用工具函数
export * from './ocr-common';
export type { OCRResult } from './ocr-common';

/**
 * 统一的 OCR 识别接口
 * 使用 react-native-tesseract-ocr 进行本地识别（完全离线）
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
      console.log('[OCR] 开始本地识别:', imageUri);
    }

    // 检查图片是否存在（本地文件）
    if (imageUri.startsWith('file://')) {
      const fileInfo = await (FileSystem as any).getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('图片不存在');
      }
    }

    // 执行识别
    const text = await RnTesseractOcr.recognize(imageUri, 'ENG', {
      level: 'BASE', // 识别精度: BASE (快速), BEST (高精度)
    });

    if (__DEV__) {
      console.log('[OCR] Tesseract 识别结果:', {
        textLength: text?.length || 0,
      });
    }

    const trimmedText = text?.trim() || '';

    if (!trimmedText || trimmedText.length === 0) {
      return {
        success: false,
        error: '未识别到文本，请重新拍摄',
      };
    }

    // 按行分割文本
    const lines = trimmedText.split('\n').filter((line: string) => line.trim().length > 0);

    // 提取有效的英文单词
    const words = extractValidWords({ success: true, text: trimmedText, lines });
    const validWords: Array<{ word: string; phonetic?: string; partOfSpeech?: string; definition?: string }> =
      words.map(word => ({ word }));

    if (__DEV__) {
      console.log('[OCR] 识别完成:', {
        wordsCount: validWords.length,
        textLength: trimmedText.length,
        linesCount: lines.length,
      });
    }

    return {
      success: true,
      text: trimmedText,
      lines,
      confidence: 0.85, // react-native-tesseract-ocr 不返回置信度，使用默认值
      words: validWords,
    };
  } catch (error: any) {
    console.error('[OCR] 识别失败:', error);

    // 提供更详细的错误信息
    let errorMessage = 'OCR 识别失败';

    if (error.message) {
      errorMessage = error.message;
    }

    // 如果是网络错误，提示用户首次使用需要下载语言包
    if (error.message?.includes('network') || error.message?.includes('download')) {
      errorMessage = '首次使用需要下载语言包（约 10MB），请检查网络连接';
    }

    if (__DEV__) {
      console.error('[OCR] 错误详情:', errorMessage);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * 清理 OCR 资源（组件卸载时调用）
 */
export const cleanup = async () => {
  // react-native-tesseract-ocr 不需要手动清理
  // 保留此函数以保持 API 一致性
};

/**
 * 检查是否首次使用（需要下载语言包）
 */
export const isFirstTimeUse = async (): Promise<boolean> => {
  try {
    const cacheDir = `${(FileSystem as any).cacheDirectory}tesseract/`;
    const langData = await (FileSystem as any).getInfoAsync(`${cacheDir}eng.traineddata`);
    return !langData.exists;
  } catch {
    return true;
  }
};

// 导出别名，保持向后兼容
export { extractValidWords as extractEnglishWords };
