// OCR 主入口文件
// 使用 Tesseract.js Core 进行离线 OCR 识别
// 适配 React Native 环境（直接使用 core，不依赖 Web Worker）

import * as FileSystem from 'expo-file-system/legacy';
import { createWorker, OEM, PSM } from 'tesseract.js-core';
import { extractValidWords } from './ocr-common';

// 通用工具函数
export * from './ocr-common';
export type { OCRResult } from './ocr-common';

/**
 * 统一的 OCR 识别接口
 * 使用 Tesseract.js Core 进行离线识别（React Native 兼容模式）
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
  let worker: any = null;

  try {
    if (__DEV__) {
      console.log('[OCR] 开始识别:', imageUri);
    }

    // 读取图片为 Base64
    const base64 = await (FileSystem as any).readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // 创建 worker（使用 core 模式，不依赖 Web Worker）
    worker = await createWorker({
      logger: (m: any) => {
        if (__DEV__) {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] 识别进度: ${(m.progress * 100).toFixed(0)}%`);
          } else {
            console.log(`[OCR] ${m.status}`);
          }
        }
      },
    });

    // 加载英语语言包
    await worker.loadLanguage('eng');

    // 初始化识别器
    await worker.initialize('eng', OEM.LSTM_ONLY);

    // 设置识别参数
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    });

    // 识别图片
    const result = await worker.recognize(`data:image/jpeg;base64,${base64}`);

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
  } finally {
    // 清理 worker
    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {
        console.error('[OCR] 清理 worker 失败:', e);
      }
    }
  }
};

// 导出别名，保持向后兼容
export { extractValidWords as extractEnglishWords };
