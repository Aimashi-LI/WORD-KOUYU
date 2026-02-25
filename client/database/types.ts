// 单词数据模型
export interface Word {
  id: number;
  word: string;
  phonetic?: string;
  definition: string;
  partOfSpeech?: string;
  split?: string;
  mnemonic?: string;
  sentence?: string;
  difficulty: number;
  stability: number;
  last_review?: string;
  next_review?: string;
  avg_response_time: number;
  is_mastered: number;
  review_count: number;
  created_at: string;
}

// 新增单词（不含 ID）
export interface NewWord {
  word: string;
  phonetic?: string;
  definition: string;
  partOfSpeech?: string;
  split?: string;
  mnemonic?: string;
  sentence?: string;
  difficulty?: number;
  stability?: number;
  avg_response_time?: number;
  is_mastered?: number;
  review_count?: number;
}

// 句子数据模型
export interface Sentence {
  id: number;
  word_id?: number;
  content: string;
  type: 'mnemonic' | 'example';
  created_at: string;
}

// 词库数据模型
export interface Wordbook {
  id: number;
  name: string;
  description?: string;
  word_count: number;
  is_preset: number;
}

// 编码数据模型
export interface Code {
  id: number;
  letter: string;
  chinese: string;
  created_at: string;
}

// 复习记录
export interface ReviewLog {
  id: number;
  word_id: number;
  score: number;
  response_time: number;
  reviewed_at: string;
}

// 测试类型
export type TestType = 'spelling' | 'split_definition' | 'recognition';

// 复习会话数据
export interface ReviewSession {
  wordId: number;
  testType: TestType;
  timeBudget: number;
  scores: number[];
  responseTimes: number[];
}

// 批量导入数据格式
export interface ImportWord {
  word: string;
  phonetic?: string;
  definition: string;
  split?: string;
  mnemonic?: string;
  partOfSpeech?: string;
  example?: string;
}
