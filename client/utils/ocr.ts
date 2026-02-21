// OCR 主入口文件
// 使用后端 API 进行 OCR 识别
// 适合 Expo Go 环境，无需原生模块

import * as FileSystem from 'expo-file-system/legacy';
import { extractValidWords } from './ocr-common';

// 通用工具函数
export * from './ocr-common';
export type { OCRResult } from './ocr-common';

/**
 * 统一的 OCR 识别接口
 * 调用后端 API 进行识别（Expo Go 兼容）
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

    // 调用后端 OCR API
    /**
     * 服务端文件：server/src/routes/ocr.ts
     * 接口：POST /api/v1/ocr/recognize
     * Body (multipart/form-data):
     *   - file: 图片文件
     * Response:
     * {
     *   success: true,
     *   words: [
     *     {
     *       word: "单词",
     *       phonetic: "音标",
     *       partOfSpeech: "词性",
     *       definition: "释义"
     *     }
     *   ]
     * }
     */
    const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '';

    // 构建 FormData
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    console.log('[OCR] 调用后端 API...');

    const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ocr/recognize`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    console.log('[OCR] 后端响应:', result);

    if (!result.success) {
      throw new Error(result.error || 'OCR 识别失败');
    }

    const words = result.words || [];

    // 从单词数组中提取文本和行
    const text = words.map((w: any) => w.word).join(' ');
    const lines = words.map((w: any) => `${w.word} ${w.definition || ''}`);

    if (__DEV__) {
      console.log('[OCR] 识别完成:', {
        wordsCount: words.length,
        textLength: text.length,
      });
    }

    return {
      success: true,
      text,
      lines,
      confidence: 1,
      words, // 保留完整的单词数据
    };
  } catch (error: any) {
    console.error('[OCR] 识别失败:', error);

    // 提供更详细的错误信息
    const errorMessage = error.message || 'OCR 识别失败';

    if (__DEV__) {
      console.error('[OCR] 错误详情:', errorMessage);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

// 导出别名，保持向后兼容
export { extractValidWords as extractEnglishWords };
