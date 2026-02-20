import { getDatabase } from './index';

/**
 * 音标数据接口
 */
export interface Phonetic {
  id: number;
  word: string;
  phonetic: string;
  created_at: string;
}

/**
 * 获取单词的音标（本地查询）
 * @param word 单词（不区分大小写）
 * @returns 音标字符串，如果未找到返回 null
 */
export async function getPhoneticByWord(word: string): Promise<string | null> {
  const db = getDatabase();
  if (!db) return null;

  try {
    const result = await db.getFirstAsync<{ phonetic: string }>(
      'SELECT phonetic FROM phonetics WHERE LOWER(word) = ? LIMIT 1',
      [word.toLowerCase()]
    );
    return result ? result.phonetic : null;
  } catch (error) {
    console.error('查询音标失败:', word, error);
    return null;
  }
}

/**
 * 添加或更新音标
 * @param word 单词
 * @param phonetic 音标
 */
export async function upsertPhonetic(word: string, phonetic: string): Promise<void> {
  const db = getDatabase();
  if (!db) return;

  try {
    await db.runAsync(
      `INSERT INTO phonetics (word, phonetic, created_at) 
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(word) DO UPDATE SET 
       phonetic = excluded.phonetic,
       created_at = datetime('now')`,
      [word.toLowerCase(), phonetic]
    );
  } catch (error) {
    console.error('保存音标失败:', word, error);
  }
}

/**
 * 批量添加音标
 * @param phonetics 音标数据数组
 */
export async function batchInsertPhonetics(phonetics: { word: string; phonetic: string }[]): Promise<void> {
  const db = getDatabase();
  if (!db) return;

  try {
    for (const item of phonetics) {
      await upsertPhonetic(item.word, item.phonetic);
    }
  } catch (error) {
    console.error('批量保存音标失败:', error);
  }
}

/**
 * 获取所有音标
 * @returns 所有音标数据
 */
export async function getAllPhonetics(): Promise<Phonetic[]> {
  const db = getDatabase();
  if (!db) return [];

  try {
    return await db.getAllAsync<Phonetic>('SELECT * FROM phonetics ORDER BY word');
  } catch (error) {
    console.error('获取所有音标失败:', error);
    return [];
  }
}

/**
 * 删除音标
 * @param word 单词
 */
export async function deletePhonetic(word: string): Promise<void> {
  const db = getDatabase();
  if (!db) return;

  try {
    await db.runAsync('DELETE FROM phonetics WHERE LOWER(word) = ?', [word.toLowerCase()]);
  } catch (error) {
    console.error('删除音标失败:', word, error);
  }
}

/**
 * 搜索音标（模糊匹配）
 * @param keyword 关键词
 * @returns 匹配的音标列表
 */
export async function searchPhonetics(keyword: string): Promise<Phonetic[]> {
  const db = getDatabase();
  if (!db) return [];

  try {
    return await db.getAllAsync<Phonetic>(
      'SELECT * FROM phonetics WHERE word LIKE ? ORDER BY word LIMIT 50',
      [`%${keyword.toLowerCase()}%`]
    );
  } catch (error) {
    console.error('搜索音标失败:', error);
    return [];
  }
}
