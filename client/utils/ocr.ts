// OCR 主入口文件
// 使用 Google ML Kit 进行离线 OCR 识别
// 支持 iOS 和所有主流 Android 设备（华为、小米、OPPO、vivo 等）

import * as FileSystem from 'expo-file-system/legacy';
// @ts-ignore - react-native-ml-kit 没有 TypeScript 类型定义
// eslint-disable-next-line import/no-unresolved
import MlKitOcr from 'react-native-ml-kit';
import { extractValidWords } from './ocr-common';

// 通用工具函数
export * from './ocr-common';
export type { OCRResult } from './ocr-common';

/**
 * 统一的 OCR 识别接口
 * 使用 Google ML Kit 进行离线识别（移动端优化）
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

    // 使用 Google ML Kit 进行 OCR 识别
    // 注意：react-native-ml-kit 的文档路径必须是绝对路径
    // React Native 的 file:// URI 可以直接使用
    const result = await MlKitOcr.recognize(imageUri);

    if (__DEV__) {
      console.log('[OCR] 识别完成:', {
        textLength: result.text?.length || 0,
        lines: result.lines?.length || 0,
      });
    }

    // 提取文本行
    const lines: string[] = [];
    if (result.lines && Array.isArray(result.lines)) {
      result.lines.forEach((line: any) => {
        if (line.text && line.text.trim()) {
          lines.push(line.text.trim());
        }
      });
    } else if (result.text) {
      // 如果没有详细数据，使用文本拆分
      lines.push(...result.text.split('\n').filter((line: string) => line.trim()));
    }

    return {
      success: true,
      text: result.text || '',
      lines,
      confidence: 1, // ML Kit 没有提供置信度，使用默认值
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
