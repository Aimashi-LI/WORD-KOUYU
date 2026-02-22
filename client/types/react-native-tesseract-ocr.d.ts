declare module 'react-native-tesseract-ocr' {
  export interface OcrOptions {
    level?: 'BASE' | 'BEST';
  }

  export interface TesseractOcrType {
    recognize: (
      imageUri: string,
      language: string,
      options?: OcrOptions
    ) => Promise<string>;
  }

  const TesseractOcr: TesseractOcrType;
  export default TesseractOcr;

  // 语言常量
  export const LANG_ENGLISH: 'eng';
  export const LANG_CHINESE_SIMPLIFIED: 'chi_sim';
  export const LANG_CHINESE_TRADITIONAL: 'chi_tra';
  export const LANG_JAPANESE: 'jpn';
  export const LANG_KOREAN: 'kor';

  // 辅助函数
  export function useEventListener(eventType: string, listener: (...args: any[]) => void): void;
}
