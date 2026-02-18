import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';

const DB_NAME = 'word_review.db';
let db: SQLite.SQLiteDatabase | null = null;

// 数据库迁移：检查并添加缺失的字段
async function migrateDatabase(): Promise<void> {
  if (!db) return;

  try {
    // 检查并添加 partOfSpeech 字段
    const result = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM pragma_table_info('words') WHERE name = 'partOfSpeech'"
    );

    if (!result) {
      try {
        await db.execAsync('ALTER TABLE words ADD COLUMN partOfSpeech TEXT');
        console.log('Added partOfSpeech column to words table');
      } catch (error: any) {
        // 如果字段已存在，忽略错误
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
      }
    }

    // 检查并添加 sentence 字段
    const sentenceResult = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM pragma_table_info('words') WHERE name = 'sentence'"
    );

    if (!sentenceResult) {
      try {
        await db.execAsync('ALTER TABLE words ADD COLUMN sentence TEXT');
        console.log('Added sentence column to words table');
      } catch (error: any) {
        // 如果字段已存在，忽略错误
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
      }
    }

    console.log('Database migration completed');
  } catch (error) {
    console.error('Database migration failed:', error);
    // 迁移失败不应该阻止应用启动，继续运行
  }
}

// 数据库初始化
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DB_NAME);

  // 创建所有表
  await db.execAsync(`
    -- 单词表
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      phonetic TEXT,
      definition TEXT NOT NULL,
      partOfSpeech TEXT,
      split TEXT,
      mnemonic TEXT,
      sentence TEXT,
      difficulty REAL DEFAULT 0,
      stability REAL DEFAULT 0,
      last_review TEXT,
      next_review TEXT,
      avg_response_time REAL DEFAULT 0,
      is_mastered INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- 句子表
    CREATE TABLE IF NOT EXISTS sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER,
      content TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('mnemonic', 'example')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    );

    -- 词库表
    CREATE TABLE IF NOT EXISTS wordbooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      word_count INTEGER DEFAULT 0,
      is_preset INTEGER DEFAULT 0
    );

    -- 词库单词关联表
    CREATE TABLE IF NOT EXISTS wordbook_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wordbook_id INTEGER NOT NULL,
      word_id INTEGER NOT NULL,
      FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    );

    -- 编码表
    CREATE TABLE IF NOT EXISTS codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      letter TEXT NOT NULL,
      chinese TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(letter, chinese)
    );

    -- 复习记录表
    CREATE TABLE IF NOT EXISTS review_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      score REAL NOT NULL,
      response_time REAL NOT NULL,
      reviewed_at TEXT NOT NULL,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_words_next_review ON words(next_review);
    CREATE INDEX IF NOT EXISTS idx_words_is_mastered ON words(is_mastered);
    CREATE INDEX IF NOT EXISTS idx_review_logs_word_id ON review_logs(word_id);
    CREATE INDEX IF NOT EXISTS idx_wordbook_words_wordbook_id ON wordbook_words(wordbook_id);
    CREATE INDEX IF NOT EXISTS idx_wordbook_words_word_id ON wordbook_words(word_id);
  `);

  // 数据库迁移：添加缺失的字段
  await migrateDatabase();

  console.log('Database initialized successfully');
  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// 获取数据库文件路径（用于备份）
export async function getDatabasePath(): Promise<string> {
  const fileUri = `${(FileSystem as any).documentDirectory}SQLite/${DB_NAME}`;
  return fileUri;
}
