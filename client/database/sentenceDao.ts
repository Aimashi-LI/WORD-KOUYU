import { getDatabase } from './index';
import { Sentence } from './types';

// 获取单词的所有例句
export async function getSentencesByWordId(wordId: number): Promise<Sentence[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM sentences WHERE word_id = ? AND type = ? ORDER BY created_at DESC',
    [wordId, 'example']
  );
  return rows.map(mapToSentence);
}

// 添加例句
export async function addSentence(wordId: number, content: string): Promise<number> {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  const result = await db.runAsync(
    'INSERT INTO sentences (word_id, content, type, created_at) VALUES (?, ?, ?, ?)',
    [wordId, content, 'example', now]
  );
  
  return result.lastInsertRowId;
}

// 删除例句
export async function deleteSentence(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM sentences WHERE id = ?', [id]);
}

function mapToSentence(row: any): Sentence {
  return {
    id: row.id,
    word_id: row.word_id,
    content: row.content,
    type: row.type,
    created_at: row.created_at
  };
}
