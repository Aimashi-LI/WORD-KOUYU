declare module 'tesseract.js-core' {
  export interface CreateWorkerOptions {
    logger?: (m: any) => void;
  }

  export const OEM: {
    TESSERACT_ONLY: 0;
    LSTM_ONLY: 1;
    TESSERACT_LSTM_COMBINED: 2;
    DEFAULT: 3;
  };

  export const PSM: {
    OSD_ONLY: 0;
    AUTO_OSD: 1;
    AUTO_ONLY: 2;
    AUTO: 3;
    SINGLE_COLUMN: 4;
    SINGLE_BLOCK_VERT_TEXT: 5;
    SINGLE_BLOCK: 6;
    SINGLE_LINE: 7;
    SINGLE_WORD: 8;
    CIRCLE_WORD: 9;
    SINGLE_CHAR: 10;
    SPARSE_TEXT: 11;
    SPARSE_TEXT_OSD: 12;
    RAW_LINE: 13;
  };

  export function createWorker(options?: CreateWorkerOptions): Promise<Worker>;
  export function createWorker(lang?: string | string[], oem?: number, psm?: number): Promise<Worker>;

  export interface Worker {
    loadLanguage(lang: string | string[]): Promise<void>;
    initialize(lang?: string | string[], oem?: number, psm?: number): Promise<void>;
    setParameters(params: any): Promise<void>;
    recognize(image: string): Promise<any>;
    terminate(): Promise<void>;
    writeText(path: string, text: string): Promise<void>;
    getPDF(title: string): Promise<Uint8Array>;
  }
}
