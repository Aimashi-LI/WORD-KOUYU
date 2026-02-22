declare module 'react-native-tesseract-ocr' {
  export interface OcrOptions {
    level?: 'BASE' | 'BEST';
  }

  export function recognize(
    imageUri: string,
    language: string,
    options?: OcrOptions
  ): Promise<string>;

  export default {
    recognize: (
      imageUri: string,
      language: string,
      options?: OcrOptions
    ) => Promise<string>,
  };
}
