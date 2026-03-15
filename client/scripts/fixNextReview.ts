/**
 * 修复没有 next_review 的单词
 * 为这些单词设置初始的 next_review（10分钟后）
 */

import { initDatabase } from '../database';
import { updateWord, getAllWords } from '../database/wordDao';

export async function fixWordsWithoutNextReview() {
  console.log('[fixWordsWithoutNextReview] 开始修复没有 next_review 的单词...');

  try {
    await initDatabase();

    const allWords = await getAllWords();
    const wordsWithoutNextReview = allWords.filter(w => !w.next_review);

    console.log(`[fixWordsWithoutNextReview] 共有 ${allWords.length} 个单词`);
    console.log(`[fixWordsWithoutNextReview] 其中 ${wordsWithoutNextReview.length} 个单词没有 next_review`);

    if (wordsWithoutNextReview.length === 0) {
      console.log('[fixWordsWithoutNextReview] 所有单词都有 next_review，无需修复');
      return;
    }

    const now = new Date();
    for (const word of wordsWithoutNextReview) {
      // 为新单词设置初始的 next_review（10分钟后）
      const nextReviewDate = new Date(now);
      nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 10);
      const nextReview = nextReviewDate.toISOString();

      // 如果单词没有 last_review，设置为创建时间
      const lastReview = word.last_review || word.created_at || now.toISOString();

      await updateWord(word.id, {
        last_review: lastReview,
        next_review: nextReview,
      });

      console.log(`[fixWordsWithoutNextReview] 修复单词: ${word.word} (ID: ${word.id}), next_review: ${nextReview}`);
    }

    console.log(`[fixWordsWithoutNextReview] 修复完成，共修复 ${wordsWithoutNextReview.length} 个单词`);
  } catch (error) {
    console.error('[fixWordsWithoutNextReview] 修复失败:', error);
  }
}

// 如果直接运行此脚本
if (typeof require !== 'undefined' && require.main === module) {
  fixWordsWithoutNextReview().then(() => {
    console.log('[fixWordsWithoutNextReview] 脚本执行完成');
    process.exit(0);
  });
}
