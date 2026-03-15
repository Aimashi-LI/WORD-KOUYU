import { getDatabase } from './index';
import { Wordbook, Word } from './types';

// 获取所有词库
export async function getAllWordbooks(): Promise<Wordbook[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM wordbooks ORDER BY is_preset DESC, name ASC');
  console.log('[getAllWordbooks] 获取到词库列表:', rows.map((w: any) => ({ id: w.id, name: w.name, is_preset: w.is_preset, word_count: w.word_count })));
  return rows.map(mapToWordbook);
}

// 获取单词所在的词库列表
export async function getWordbookNamesByWordId(wordId: number): Promise<Wordbook[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT wb.* FROM wordbooks wb
     INNER JOIN wordbook_words ww ON wb.id = ww.wordbook_id
     WHERE ww.word_id = ?
     ORDER BY wb.name ASC`,
    [wordId]
  );
  return rows.map(mapToWordbook);
}

// 获取词库及其单词数
export async function getWordbookWithCount(wordbookId: number): Promise<Wordbook | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<any>(
    `SELECT wb.*, COUNT(ww.word_id) as actual_count
     FROM wordbooks wb
     LEFT JOIN wordbook_words ww ON wb.id = ww.wordbook_id
     WHERE wb.id = ?
     GROUP BY wb.id`,
    [wordbookId]
  );
  
  if (row) {
    const wordbook = mapToWordbook(row);
    wordbook.word_count = row.actual_count;
    return wordbook;
  }
  return null;
}

// 创建词库
export async function createWordbook(name: string, description?: string): Promise<number> {
  const db = getDatabase();
  const result = await db.runAsync(
    'INSERT INTO wordbooks (name, description, word_count, is_preset) VALUES (?, ?, 0, 0)',
    [name, description || null]
  );
  
  // 更新单词数
  await updateWordbookCount(result.lastInsertRowId);
  
  return result.lastInsertRowId;
}

// 删除词库
export async function deleteWordbook(id: number): Promise<void> {
  const db = getDatabase();
  console.log('[deleteWordbook] 开始删除词库，ID:', id);
  
  // 先检查词库是否存在
  const wordbook = await db.getFirstAsync<any>('SELECT * FROM wordbooks WHERE id = ?', [id]);
  if (!wordbook) {
    console.error('[deleteWordbook] 词库不存在，ID:', id);
    throw new Error('词库不存在');
  }
  console.log('[deleteWordbook] 找到词库:', { id: wordbook.id, name: wordbook.name, is_preset: wordbook.is_preset });
  
  // 执行删除
  const result = await db.runAsync('DELETE FROM wordbooks WHERE id = ?', [id]);
  console.log('[deleteWordbook] 删除完成，影响行数:', result.changes);
  
  // 验证删除结果
  const remaining = await db.getAllAsync<any>('SELECT * FROM wordbooks ORDER BY is_preset DESC, name ASC');
  console.log('[deleteWordbook] 删除后剩余词库:', remaining.map((w: any) => ({ id: w.id, name: w.name, is_preset: w.is_preset })));
  
  // 检查是否真的删除了
  const stillExists = await db.getFirstAsync<any>('SELECT id FROM wordbooks WHERE id = ?', [id]);
  if (stillExists) {
    console.error('[deleteWordbook] 删除失败，词库仍然存在，ID:', id);
    throw new Error('删除失败');
  }
  
  console.log('[deleteWordbook] 验证通过，词库已成功删除');
}

// 更新词库
export async function updateWordbook(id: number, name: string, description?: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'UPDATE wordbooks SET name = ?, description = ? WHERE id = ?',
    [name, description || null, id]
  );
}

// 添加单词到词库
export async function addWordToWordbook(wordbookId: number, wordId: number): Promise<void> {
  const db = getDatabase();
  
  try {
    await db.runAsync(
      'INSERT INTO wordbook_words (wordbook_id, word_id) VALUES (?, ?)',
      [wordbookId, wordId]
    );
    await updateWordbookCount(wordbookId);
  } catch (error) {
    // 如果已存在，忽略
  }
}

// 批量添加单词到词库
export async function addWordsToWordbook(wordbookId: number, wordIds: number[]): Promise<void> {
  const db = getDatabase();
  
  await db.withTransactionAsync(async () => {
    for (const wordId of wordIds) {
      try {
        await db.runAsync(
          'INSERT INTO wordbook_words (wordbook_id, word_id) VALUES (?, ?)',
          [wordbookId, wordId]
        );
      } catch (error) {
        // 忽略重复项
      }
    }
  });
  
  await updateWordbookCount(wordbookId);
}

// 从词库中移除单词
export async function removeWordFromWordbook(wordbookId: number, wordId: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'DELETE FROM wordbook_words WHERE wordbook_id = ? AND word_id = ?',
    [wordbookId, wordId]
  );
  await updateWordbookCount(wordbookId);
}

// 获取词库中的所有单词
export async function getWordsInWordbook(wordbookId: number): Promise<Word[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT w.* FROM words w
     INNER JOIN wordbook_words ww ON w.id = ww.word_id
     WHERE ww.wordbook_id = ?
     ORDER BY w.created_at DESC`,
    [wordbookId]
  );
  return rows.map(mapToWord);
}

// 获取词库统计
export async function getWordbookStats(wordbookId: number): Promise<{
  total: number;
  mastered: number;
  pending: number;
}> {
  const db = getDatabase();
  
  const totalRow = await db.getFirstAsync<any>(
    `SELECT COUNT(*) as count FROM wordbook_words WHERE wordbook_id = ?`,
    [wordbookId]
  );
  
  const masteredRow = await db.getFirstAsync<any>(
    `SELECT COUNT(*) as count 
     FROM wordbook_words ww
     INNER JOIN words w ON ww.word_id = w.id
     WHERE ww.wordbook_id = ? AND w.is_mastered = 1`,
    [wordbookId]
  );
  
  const now = new Date().toISOString();
  const pendingRow = await db.getFirstAsync<any>(
    `SELECT COUNT(*) as count 
     FROM wordbook_words ww
     INNER JOIN words w ON ww.word_id = w.id
     WHERE ww.wordbook_id = ? 
     AND (w.is_mastered = 0 OR w.is_mastered IS NULL)
     AND (w.next_review IS NULL OR w.next_review <= ?)`,
    [wordbookId, now]
  );
  
  return {
    total: totalRow?.count || 0,
    mastered: masteredRow?.count || 0,
    pending: pendingRow?.count || 0
  };
}

// 更新词库单词数
export async function updateWordbookCount(wordbookId: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE wordbooks 
     SET word_count = (SELECT COUNT(*) FROM wordbook_words WHERE wordbook_id = ?)
     WHERE id = ?`,
    [wordbookId, wordbookId]
  );
}

function mapToWordbook(row: any): Wordbook {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    word_count: row.word_count,
    is_preset: row.is_preset
  };
}

function mapToWord(row: any): Word {
  return {
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
    review_count: row.review_count || 0,
    created_at: row.created_at
  };
}
