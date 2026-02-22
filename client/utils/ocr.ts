// OCR 主入口文件
// 使用 Tesseract.js 进行本地 OCR 识别
// 完全离线使用，首次需下载语言包（约 10MB）

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { extractValidWords } from './ocr-common';
import Tesseract from 'tesseract.js';

// 通用工具函数
export * from './ocr-common';
export type { OCRResult } from './ocr-common';

// Tesseract.js Worker 缓存
let tesseractWorker: any = null;

/**
 * 获取 Tesseract Worker（懒加载）
 */
async function getWorker(): Promise<any> {
  if (tesseractWorker) {
    return tesseractWorker;
  }

  // 创建 Worker
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        console.log(`[OCR] 识别进度: ${Math.round(m.progress * 100)}%`);
      }
    },
  });
  tesseractWorker = worker;
  return worker;
}

/**
 * 清理 Worker
 */
async function cleanupWorker() {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }
}

/**
 * 统一的 OCR 识别接口
 * 使用 Tesseract.js 进行本地识别（完全离线）
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

    // 获取 Worker
    const worker = await getWorker();

    // 执行识别
    const result = await worker.recognize(imageUri);

    if (__DEV__) {
      console.log('[OCR] Tesseract 识别结果:', {
        confidence: result.data.confidence,
        textLength: result.data.text?.length || 0,
      });
    }

    const text = result.data.text?.trim() || '';

    if (!text || text.length === 0) {
      return {
        success: false,
        error: '未识别到文本，请重新拍摄',
      };
    }

    // 按行分割文本
    const lines = text.split('\n').filter((line: string) => line.trim().length > 0);

    // 提取有效的英文单词
    const words = extractValidWords({ success: true, text, lines });
    const validWords: Array<{ word: string; phonetic?: string; partOfSpeech?: string; definition?: string }> =
      words.map(word => ({ word }));

    if (__DEV__) {
      console.log('[OCR] 识别完成:', {
        wordsCount: validWords.length,
        textLength: text.length,
        linesCount: lines.length,
        confidence: result.data.confidence,
      });
    }

    return {
      success: true,
      text,
      lines,
      confidence: result.data.confidence / 100, // Tesseract 返回 0-100
      words: validWords,
    };
  } catch (error: any) {
    console.error('[OCR] 识别失败:', error);

    // 清理 Worker
    await cleanupWorker();

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
  await cleanupWorker();
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
