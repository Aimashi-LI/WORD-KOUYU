import { Platform } from 'react-native';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { Word } from '@/database/types';
import { getPhoneticByWord as getPhoneticFromDB, upsertPhonetic as upsertPhoneticToDB } from '@/database/phoneticDao';
import { getDatabase } from '@/database/index';
dayjs.extend(utc);

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE ?? '').replace(/\/$/, '');

/**
 * 创建跨平台兼容的文件对象，用于 FormData.append()
 * - Web 端返回 File 对象
 * - 移动端返回 { uri, type, name } 对象（RN fetch 会自动处理）
 * @param fileUri Expo 媒体库（如 expo-image-picker、expo-camera）返回的 uri
 * @param fileName 上传时的文件名，如 'photo.jpg'
 * @param mimeType 文件 MIME 类型，如 'image/jpeg'、'audio/mpeg'
 */
export async function createFormDataFile(
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<File | { uri: string; type: string; name: string }> {
  if (Platform.OS === 'web') {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    return new File([blob], fileName, { type: mimeType });
  }
  return { uri: fileUri, type: mimeType, name: fileName };
}

/**
 * 构建文件或图片完整的URL
 * @param url 相对或绝对路径
 * @param w 宽度 (px) - 自动向下取整
 * @param h 高度 (px)
 */
export const buildAssetUrl = (url?: string | null, w?: number, h?: number): string | undefined => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url; // 绝对路径直接返回

  // 1. 去除 Base 尾部和 Path 头部的斜杠
  const base = API_BASE;
  const path = url.replace(/^\//, '');
  const abs = `${base}/${path}`;

  // 2. 无需缩略图则直接返回
  if (!w && !h) return abs;

  // 3. 构造参数，保留原有 Query (如有)
  const separator = abs.includes('?') ? '&' : '?';
  const query = [
    w ? `w=${Math.floor(w)}` : '',
    h ? `h=${Math.floor(h)}` : ''
  ].filter(Boolean).join('&');
  return `${abs}${separator}${query}`;
};

/**
 * 将UTC时间字符串转换为本地时间字符串
 * @param utcDateStr UTC时间字符串，格式如：2025-11-26T01:49:48.009573
 * @returns 本地时间字符串，格式如：2025-11-26 08:49:48
 */
export const convertToLocalTimeStr = (utcDateStr: string): string => {
  if (!utcDateStr) {
    return utcDateStr;
  }
  const microUtcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,6}/;
  if (!microUtcRegex.test(utcDateStr)) {
    console.log('invalid utcDateStr:', utcDateStr);
    return utcDateStr;
  }
  const normalized = utcDateStr.replace(/\.(\d{6})$/, (_, frac) => `.${frac.slice(0, 3)}`);
  const d = dayjs.utc(normalized);
  if (!d.isValid()) {
    return utcDateStr;
  }
  return d.local().format('YYYY-MM-DD HH:mm:ss');
}

/**
 * 检查单词信息是否完整
 * 完整的单词信息需要包含：单词、词性、释义、拆分、短句（助记短句）
 * 注意：例句（sentence）是可选的，不参与信息完整性判断
 * @param word 单词对象
 * @returns 如果信息完整返回 false，否则返回 true
 */
export const isWordIncomplete = (word: Word): boolean => {
  // 必填字段检查
  if (!word.word || !word.definition) {
    return true;
  }

  // 必选字段检查（不含例句）
  if (!word.partOfSpeech) return true;
  if (!word.split) return true;
  if (!word.mnemonic) return true;

  // 例句是可选的，不参与判断
  return false;
}

/**
 * 根据单词获取音标（本地查询）
 * 从本地音标数据库中查询音标
 * 
 * @param wordText 单词
 * @returns 音标字符串，如果未找到返回 null
 */
export const fetchPhoneticByWord = async (wordText: string): Promise<string | null> => {
  if (!wordText || wordText.trim().length === 0) {
    console.log('[音标查询] 单词为空');
    return null;
  }

  const cleanedWord = wordText.trim().toLowerCase();
  
  try {
    const phonetic = await getPhoneticFromDB(cleanedWord);
    
    if (phonetic) {
      console.log(`[音标查询] 成功: ${cleanedWord} -> ${phonetic}`);
      return phonetic;
    }
    
    console.log(`[音标查询] 未找到: ${cleanedWord}`);
    return null;
  } catch (error) {
    console.error(`[音标查询] 异常: ${cleanedWord}`, error);
    return null;
  }
}

/**
 * 添加或更新音标到本地数据库
 * 
 * @param word 单词
 * @param phonetic 音标
 */
export const upsertPhonetic = async (word: string, phonetic: string): Promise<void> => {
  if (!word || !phonetic) return;
  
  try {
    await upsertPhoneticToDB(word.toLowerCase(), phonetic);
    console.log(`[音标保存] 成功: ${word.toLowerCase()} -> ${phonetic}`);
  } catch (error) {
    console.error(`[音标保存] 失败: ${word}`, error);
  }
}
