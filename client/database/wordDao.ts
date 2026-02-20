import { getDatabase } from './index';
import { Word, NewWord, ReviewLog } from './types';

// 获取所有单词
export async function getAllWords(): Promise<Word[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM words ORDER BY created_at DESC');
  
  console.log('[getAllWords] 查询返回的行数:', rows.length);
  if (rows.length > 0) {
    console.log('[getAllWords] 第一行的所有字段:', Object.keys(rows[0]));
    console.log('[getAllWords] 第一行完整数据:', JSON.stringify(rows[0], null, 2));
    console.log('[getAllWords] 第一行 partOfSpeech 值:', rows[0].partOfSpeech);
  }
  
  const mappedWords = rows.map(mapToWord);
  
  // 新增：打印映射后的第一个单词
  if (mappedWords.length > 0) {
    console.log('[getAllWords] 映射后的第一个单词:', JSON.stringify(mappedWords[0], null, 2));
    console.log('[getAllWords] 映射后 partOfSpeech 值:', mappedWords[0].partOfSpeech);
  }
  
  // 最后检查：返回前的数据状态
  if (mappedWords.length > 0) {
    console.log('[getAllWords] 返回前 - 第一个单词的所有字段:', Object.keys(mappedWords[0]));
    console.log('[getAllWords] 返回前 - partOfSpeech:', mappedWords[0].partOfSpeech);
    console.log('[getAllWords] 返回前 - sentence:', mappedWords[0].sentence);
  }
  
  // 测试：在返回前创建一个硬编码的对象来测试
  if (mappedWords.length > 0) {
    console.log('[getAllWords] 测试：硬编码对象的字段:', Object.keys({
      id: 1,
      word: 'test',
      phonetic: null,
      definition: '测试',
      partOfSpeech: 'n.测试',
      split: null,
      mnemonic: null,
      sentence: null,
      difficulty: 0,
      stability: 0,
      last_review: null,
      next_review: null,
      avg_response_time: 0,
      is_mastered: 0,
      created_at: '2024-01-01'
    }));
  }
  
  return mappedWords;
}

// 根据 ID 获取单词
export async function getWordById(id: number): Promise<Word | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM words WHERE id = ?', [id]);
  return row ? mapToWord(row) : null;
}

// 根据单词文本获取
export async function getWordByText(word: string): Promise<Word | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM words WHERE word = ?', [word]);
  return row ? mapToWord(row) : null;
}

// 新增单词
export async function createWord(word: NewWord): Promise<number> {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  console.log('[createWord] 准备插入单词:', word.word);
  console.log('[createWord] partOfSpeech 参数值:', word.partOfSpeech);
  console.log('[createWord] partOfSpeech 参数类型:', typeof word.partOfSpeech);
  
  const params = [
    word.word,
    word.phonetic || null,
    word.definition,
    word.partOfSpeech || null,
    word.split || null,
    word.mnemonic || null,
    word.sentence || null,
    word.difficulty || 0,
    word.stability || 0,
    word.avg_response_time || 0,
    word.is_mastered || 0,
    now
  ];
  
  console.log('[createWord] SQL 参数数组:', params.map((p, i) => `参数${i}: ${p}`));
  
  const result = await db.runAsync(
    `INSERT INTO words (word, phonetic, definition, partOfSpeech, split, mnemonic, sentence, difficulty, stability, avg_response_time, is_mastered, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params
  );
  
  console.log('[createWord] 插入成功，lastInsertRowId:', result.lastInsertRowId);
  
  return result.lastInsertRowId;
}

// 批量创建单词
export async function createWords(words: NewWord[]): Promise<number[]> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const ids: number[] = [];
  
  await db.withTransactionAsync(async () => {
    for (const word of words) {
      const result = await db.runAsync(
        `INSERT INTO words (word, phonetic, definition, partOfSpeech, split, mnemonic, sentence, difficulty, stability, avg_response_time, is_mastered, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          word.word,
          word.phonetic || null,
          word.definition,
          word.partOfSpeech || null,
          word.split || null,
          word.mnemonic || null,
          word.sentence || null,
          word.difficulty || 0,
          word.stability || 0,
          word.avg_response_time || 0,
          word.is_mastered || 0,
          now
        ]
      );
      ids.push(result.lastInsertRowId);
    }
  });
  
  return ids;
}

// 更新单词
export async function updateWord(id: number, updates: Partial<Omit<Word, 'id' | 'created_at'>>): Promise<void> {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.word !== undefined) { fields.push('word = ?'); values.push(updates.word); }
  if (updates.phonetic !== undefined) { fields.push('phonetic = ?'); values.push(updates.phonetic); }
  if (updates.definition !== undefined) { fields.push('definition = ?'); values.push(updates.definition); }
  if (updates.partOfSpeech !== undefined) { fields.push('partOfSpeech = ?'); values.push(updates.partOfSpeech); }
  if (updates.split !== undefined) { fields.push('split = ?'); values.push(updates.split); }
  if (updates.mnemonic !== undefined) { fields.push('mnemonic = ?'); values.push(updates.mnemonic); }
  if (updates.sentence !== undefined) { fields.push('sentence = ?'); values.push(updates.sentence); }
  if (updates.difficulty !== undefined) { fields.push('difficulty = ?'); values.push(updates.difficulty); }
  if (updates.stability !== undefined) { fields.push('stability = ?'); values.push(updates.stability); }
  if (updates.last_review !== undefined) { fields.push('last_review = ?'); values.push(updates.last_review); }
  if (updates.next_review !== undefined) { fields.push('next_review = ?'); values.push(updates.next_review); }
  if (updates.avg_response_time !== undefined) { fields.push('avg_response_time = ?'); values.push(updates.avg_response_time); }
  if (updates.is_mastered !== undefined) { fields.push('is_mastered = ?'); values.push(updates.is_mastered); }
  
  values.push(id);
  await db.runAsync(`UPDATE words SET ${fields.join(', ')} WHERE id = ?`, values);
}

// 删除单词
export async function deleteWord(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM words WHERE id = ?', [id]);
}

// 获取待复习单词
export async function getReviewWords(limit: number = 20): Promise<Word[]> {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM words 
     WHERE (is_mastered = 0 OR is_mastered IS NULL)
     AND (next_review IS NULL OR next_review <= ?)
     ORDER BY 
       CASE WHEN next_review IS NULL THEN 0 ELSE 1 END,
       next_review ASC
     LIMIT ?`,
    [now, limit]
  );
  
  return rows.map(mapToWord);
}

// 获取已掌握单词
export async function getMasteredWords(): Promise<Word[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM words WHERE is_mastered = 1');
  return rows.map(mapToWord);
}

// 添加复习记录
export async function addReviewLog(reviewLog: Omit<ReviewLog, 'id'>): Promise<number> {
  const db = getDatabase();
  const result = await db.runAsync(
    `INSERT INTO review_logs (word_id, score, response_time, reviewed_at)
     VALUES (?, ?, ?, ?)`,
    [reviewLog.word_id, reviewLog.score, reviewLog.response_time, reviewLog.reviewed_at]
  );
  return result.lastInsertRowId;
}

// 获取单词的最近复习记录
export async function getRecentReviewLogs(wordId: number, limit: number = 3): Promise<ReviewLog[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM review_logs WHERE word_id = ? ORDER BY reviewed_at DESC LIMIT ?',
    [wordId, limit]
  );
  return rows.map(mapToReviewLog);
}

// 统计数据
export async function getWordStats(): Promise<{
  total: number;
  mastered: number;
  pending: number;
}> {
  const db = getDatabase();
  
  const totalRow = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM words');
  const masteredRow = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM words WHERE is_mastered = 1');
  const now = new Date().toISOString();
  const pendingRow = await db.getFirstAsync<any>(
    `SELECT COUNT(*) as count FROM words 
     WHERE (is_mastered = 0 OR is_mastered IS NULL)
     AND (next_review IS NULL OR next_review <= ?)`,
    [now]
  );
  
  return {
    total: totalRow?.count || 0,
    mastered: masteredRow?.count || 0,
    pending: pendingRow?.count || 0
  };
}

// 辅助函数：映射数据库行到 Word 对象
function mapToWord(row: any): Word {
  // 调试日志 - 只打印关键字段
  console.log('[mapToWord] partOfSpeech 原始值:', row.partOfSpeech);
  console.log('[mapToWord] partOfSpeech 类型:', typeof row.partOfSpeech);
  console.log('[mapToWord] sentence 原始值:', row.sentence);
  
  // 不使用类型断言，直接返回新对象
  const result = {
    id: row.id,
    word: row.word,
    phonetic: row.phonetic,
    definition: row.definition,
    partOfSpeech: row.partOfSpeech,
    split: row.split,
    mnemonic: row.mnemonic,
    sentence: row.sentence,
    difficulty: row.difficulty || 0,
    stability: row.stability || 0,
    last_review: row.last_review,
    next_review: row.next_review,
    avg_response_time: row.avg_response_time || 0,
    is_mastered: row.is_mastered || 0,
    created_at: row.created_at
  };
  
  // 打印返回对象的所有字段
  console.log('[mapToWord] 返回对象的所有字段:', Object.keys(result));
  console.log('[mapToWord] 返回对象的 partOfSpeech:', result.partOfSpeech);
  console.log('[mapToWord] 返回对象的 sentence:', result.sentence);
  
  return result;
}

// 辅助函数：映射数据库行到 ReviewLog 对象
function mapToReviewLog(row: any): ReviewLog {
  return {
    id: row.id,
    word_id: row.word_id,
    score: row.score,
    response_time: row.response_time,
    reviewed_at: row.reviewed_at
  };
}
