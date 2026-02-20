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
 * 根据单词获取美式音标
 * 使用免费 Dictionary API: https://api.dictionaryapi.dev/api/v2/entries/en/{word}
 * 
 * @param wordText 单词
 * @returns 美式音标字符串，如果获取失败返回 null
 */
export const fetchPhoneticByWord = async (wordText: string): Promise<string | null> => {
  if (!wordText || wordText.trim().length === 0) {
    console.log('获取音标失败: 单词为空');
    return null;
  }

  const cleanedWord = wordText.trim().toLowerCase();
  const API_URL = `https://api.dictionaryapi.dev/api/v2/entries/en/${cleanedWord}`;
  
  // 带超时的 fetch
  const fetchWithTimeout = async (url: string, timeout = 8000): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // 尝试获取音标（带重试）
  const attemptFetch = async (retryCount = 2): Promise<string | null> => {
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        console.log(`[音标获取] 尝试 ${attempt + 1}/${retryCount + 1}: ${cleanedWord}`);
        
        const response = await fetchWithTimeout(API_URL, 8000);
        
        if (!response.ok) {
          console.log(`[音标获取] HTTP 错误: ${cleanedWord}, 状态码 ${response.status}`);
          
          // 404 表示单词不存在，不需要重试
          if (response.status === 404) {
            console.log(`[音标获取] 单词不存在于词库: ${cleanedWord}`);
            return null;
          }
          
          // 其他错误，等待后重试
          if (attempt < retryCount) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          return null;
        }

        const data = await response.json();
        
        // 验证数据格式
        if (!Array.isArray(data) || data.length === 0) {
          console.log(`[音标获取] 无效数据格式: ${cleanedWord}`);
          return null;
        }

        const entry = data[0];
        let phoneticText: string | null = null;

        // 策略1: 从 phonetic 数组中查找美式音标
        if (entry.phonetics && Array.isArray(entry.phonetics)) {
          for (const phonetic of entry.phonetics) {
            // 检查是否有美式标记
            const isAmerican = 
              (phonetic.region && phonetic.region === 'US') ||
              (phonetic.flags && Array.isArray(phonetic.flags) && phonetic.flags.includes('US')) ||
              (phonetic.text && phonetic.text.toLowerCase().includes('us'));
            
            if (isAmerican && phonetic.text) {
              // 清理音标文本，去除前缀（如 "US: ", "UK: " 等）
              phoneticText = phonetic.text
                .replace(/^(US|UK|GA|US-GB|RP):\s*/i, '')
                .replace(/^\//, '')
                .replace(/\/$/, '')
                .trim();
              console.log(`[音标获取] 从美式标记获取: ${cleanedWord} -> ${phoneticText}`);
              break;
            }
          }
          
          // 如果没找到美式音标，使用第一个可用的音标
          if (!phoneticText && entry.phonetics.length > 0 && entry.phonetics[0].text) {
            phoneticText = entry.phonetics[0].text
              .replace(/^(US|UK|GA|US-GB|RP):\s*/i, '')
              .replace(/^\//, '')
              .replace(/\/$/, '')
              .trim();
            console.log(`[音标获取] 使用第一个音标: ${cleanedWord} -> ${phoneticText}`);
          }
        }

        // 策略2: 直接使用 phonetic 字段
        if (!phoneticText && entry.phonetic) {
          phoneticText = entry.phonetic
            .replace(/^(US|UK|GA|US-GB|RP):\s*/i, '')
            .replace(/^\//, '')
            .replace(/\/$/, '')
            .trim();
          console.log(`[音标获取] 从 phonetic 字段获取: ${cleanedWord} -> ${phoneticText}`);
        }

        // 策略3: 从 meanings 中查找
        if (!phoneticText && entry.meanings && Array.isArray(entry.meanings)) {
          for (const meaning of entry.meanings) {
            if (meaning.phonetic) {
              phoneticText = meaning.phonetic
                .replace(/^(US|UK|GA|US-GB|RP):\s*/i, '')
                .replace(/^\//, '')
                .replace(/\/$/, '')
                .trim();
              console.log(`[音标获取] 从 meanings 获取: ${cleanedWord} -> ${phoneticText}`);
              break;
            }
          }
        }

        if (phoneticText && phoneticText.length > 0) {
          console.log(`[音标获取] 成功: ${cleanedWord} -> ${phoneticText}`);
          return phoneticText;
        }

        console.log(`[音标获取] 未找到音标: ${cleanedWord}`);
        return null;

      } catch (error) {
        console.error(`[音标获取] 异常 (尝试 ${attempt + 1}): ${cleanedWord}`, error);
        
        // 如果是 AbortError（超时），重试
        if (error instanceof Error && error.name === 'AbortError') {
          if (attempt < retryCount) {
            console.log(`[音标获取] 超时，准备重试...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
        }
        
        // 最后一次尝试失败，返回 null
        if (attempt === retryCount) {
          return null;
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    return null;
  };

  return attemptFetch(2);
}
