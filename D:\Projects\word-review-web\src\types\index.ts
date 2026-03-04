// 单词类型
export interface Word {
  id: number;
  word: string;
  meaning: string;
  pronunciation?: string;
  example?: string;
  splitParts?: string;
  mnemonicSentence?: string;
  stability: number;
  difficulty: number;
  reviewCount: number;
  masteryLevel: 'low' | 'medium' | 'high';
  lastReviewDate?: string;
  nextReviewDate: string;
  createdAt: string;
}

// FSRS 算法结果类型
export interface FSRSResult {
  stability: number;
  difficulty: number;
  interval: number; // 小时
  masteryLevel: 'low' | 'medium' | 'high';
}

// 复习评分类型
export type ReviewRating = 0 | 1 | 2 | 3 | 4 | 5;

// 排序方式类型
export type SortBy = 'next_review' | 'stability' | 'review_count';

// 搜索过滤类型
export interface WordFilter {
  search?: string;
  sortBy?: SortBy;
}
