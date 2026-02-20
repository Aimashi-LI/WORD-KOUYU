import { Platform } from 'react-native';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { Word } from '@/database/types';
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
 * 完整的单词信息需要包含：单词、词性、释义、拆分、短句（助记短句）、例句
 * @param word 单词对象
 * @returns 如果信息完整返回 false，否则返回 true
 */
export const isWordIncomplete = (word: Word): boolean => {
  // 必填字段检查
  if (!word.word || !word.definition) {
    return true;
  }

  // 可选字段检查 - 只要有一个为空，就认为信息不完整
  const missingFields = [];
  if (!word.partOfSpeech) missingFields.push('词性');
  if (!word.split) missingFields.push('拆分');
  if (!word.mnemonic) missingFields.push('短句');
  if (!word.sentence) missingFields.push('例句');

  return missingFields.length > 0;
}

/**
 * 根据单词获取美式音标
 * 使用免费 Dictionary API: https://api.dictionaryapi.dev/api/v2/entries/en/{word}
 * @param wordText 单词
 * @returns 美式音标字符串，如果获取失败返回 null
 */
export const fetchPhoneticByWord = async (wordText: string): Promise<string | null> => {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordText}`);
    
    if (!response.ok) {
      console.log(`获取音标失败: ${wordText}, HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // API 返回的数据结构可能是数组
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`获取音标失败: ${wordText}, 无数据返回`);
      return null;
    }

    const entry = data[0];
    
    // 查找美式音标 (phonetic 文本或 phonetics 数组中的美式音标)
    // 优先级: phonetic.text > phonetics 数组中标记为美式的 > 第一个 phonetic
    let americanPhonetic: string | null = null;

    // 方式1: 直接的 phonetic 字段
    if (entry.phonetic && typeof entry.phonetic === 'string' && !entry.phonetic.startsWith('US:')) {
      americanPhonetic = entry.phonetic;
    }

    // 方式2: 从 phonetics 数组中查找美式音标
    if (!americanPhonetic && entry.phonetics && Array.isArray(entry.phonetics)) {
      for (const phoneticItem of entry.phonetics) {
        // 查找标记为美式的音标
        if (phoneticItem.text && (
          phoneticItem.text.includes('US') ||
          (phoneticItem.flags && phoneticItem.flags.includes('US')) ||
          (phoneticItem.region && phoneticItem.region === 'US')
        )) {
          // 提取音标部分（去掉 "US: " 前缀）
          const cleaned = phoneticItem.text.replace(/^US:\s*/, '');
          americanPhonetic = cleaned;
          break;
        }
      }

      // 如果没有找到美式音标，使用第一个音标
      if (!americanPhonetic && entry.phonetics.length > 0 && entry.phonetics[0].text) {
        const cleaned = entry.phonetics[0].text.replace(/^UK:\s*/, '');
        americanPhonetic = cleaned;
      }
    }

    // 方式3: 从 meanings 中查找音标
    if (!americanPhonetic && entry.meanings && Array.isArray(entry.meanings)) {
      for (const meaning of entry.meanings) {
        if (meaning.phonetic) {
          americanPhonetic = meaning.phonetic;
          break;
        }
      }
    }

    if (americanPhonetic) {
      console.log(`获取音标成功: ${wordText} -> ${americanPhonetic}`);
      return americanPhonetic;
    }

    console.log(`获取音标失败: ${wordText}, 未找到音标`);
    return null;
  } catch (error) {
    console.error(`获取音标异常: ${wordText}`, error);
    return null;
  }
}
