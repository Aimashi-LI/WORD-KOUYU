import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { importHighFrequencyWords } from './importHighFrequencyWords';

const DB_NAME = 'word_review.db';
const DB_VERSION = 5; // 数据库版本号 - 升级到 5，确保 sentence 字段正确处理
let db: SQLite.SQLiteDatabase | null = null;

// 基础音标数据（常用词）
const DEFAULT_PHONETICS = [
  { word: 'hello', phonetic: '/həˈloʊ/' },
  { word: 'world', phonetic: '/wɜːrld/' },
  { word: 'apple', phonetic: '/ˈæpl/' },
  { word: 'book', phonetic: '/bʊk/' },
  { word: 'computer', phonetic: '/kəmˈpjuːtər/' },
  { word: 'water', phonetic: '/ˈwɔːtər/' },
  { word: 'time', phonetic: '/taɪm/' },
  { word: 'people', phonetic: '/ˈpiːpl/' },
  { word: 'year', phonetic: '/jɪr/' },
  { word: 'good', phonetic: '/ɡʊd/' },
  { word: 'make', phonetic: '/meɪk/' },
  { word: 'word', phonetic: '/wɜːrd/' },
  { word: 'new', phonetic: '/nuː/' },
  { word: 'first', phonetic: '/fɜːrst/' },
  { word: 'work', phonetic: '/wɜːrk/' },
  { word: 'now', phonetic: '/naʊ/' },
  { word: 'find', phonetic: '/faɪnd/' },
  { word: 'long', phonetic: '/lɔːŋ/' },
  { word: 'look', phonetic: '/lʊk/' },
  { word: 'day', phonetic: '/deɪ/' },
  { word: 'get', phonetic: '/ɡet/' },
  { word: 'come', phonetic: '/kʌm/' },
  { word: 'made', phonetic: '/meɪd/' },
  { word: 'may', phonetic: '/meɪ/' },
  { word: 'part', phonetic: '/pɑːrt/' },
];

// 初始化基础音标数据
async function initDefaultPhonetics(): Promise<void> {
  if (!db) return;

  try {
    // 检查是否已初始化
    const count = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM phonetics'
    );

    // 如果音标表为空，插入基础数据
    if (!count || count.count === 0) {
      console.log('Initializing default phonetics...');
      
      for (const item of DEFAULT_PHONETICS) {
        try {
          await db.runAsync(
            'INSERT OR IGNORE INTO phonetics (word, phonetic, created_at) VALUES (?, ?, datetime(\'now\'))',
            [item.word, item.phonetic]
          );
        } catch (error) {
          console.error(`Failed to insert phonetic for ${item.word}:`, error);
        }
      }
      
      console.log(`Initialized ${DEFAULT_PHONETICS.length} default phonetics`);
    }
  } catch (error) {
    console.error('Failed to initialize default phonetics:', error);
  }
}

// 获取当前数据库版本
async function getDatabaseVersion(): Promise<number> {
  if (!db) return 0;

  try {
    const result = await db.getFirstAsync<{ version: number }>(
      'SELECT version FROM database_version WHERE id = 1'
    );
    return result ? result.version : 0;
  } catch (error) {
    // 表不存在，返回版本 0
    return 0;
  }
}

// 更新数据库版本
async function setDatabaseVersion(version: number): Promise<void> {
  if (!db) return;

  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO database_version (id, version) VALUES (1, ?)',
      [version]
    );
  } catch (error) {
    console.error('Failed to set database version:', error);
  }
}

// 数据库迁移：检查并添加缺失的字段
async function migrateDatabase(): Promise<void> {
  if (!db) return;

  try {
    const currentVersion = await getDatabaseVersion();
    console.log(`Current database version: ${currentVersion}`);

    // 如果版本已经是最新，跳过迁移
    if (currentVersion >= DB_VERSION) {
      console.log('Database is already up to date');
      return;
    }

    // 创建版本表（如果不存在）
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS database_version (
        id INTEGER PRIMARY KEY,
        version INTEGER NOT NULL
      )
    `);

    // 检查表结构并修复 NOT NULL 约束问题
    const tableInfo = await db.getAllAsync<{ name: string, type: string, notnull: number }>(
      'PRAGMA table_info(words)'
    );

    const mnemonicColumn = tableInfo.find(col => col.name === 'mnemonic');
    const sentenceColumn = tableInfo.find(col => col.name === 'sentence');
    const partOfSpeechColumn = tableInfo.find(col => col.name === 'partOfSpeech');

    // 如果 mnemonic 或 sentence 或 partOfSpeech 字段存在且有 NOT NULL 约束，需要重建表
    if ((mnemonicColumn && mnemonicColumn.notnull === 1) || 
        (sentenceColumn && sentenceColumn.notnull === 1) ||
        (partOfSpeechColumn && partOfSpeechColumn.notnull === 1)) {
      console.log('Found NOT NULL constraint on mnemonic, sentence or partOfSpeech, recreating table...');

      // 备份数据
      const words = await db.getAllAsync<any>('SELECT * FROM words');

      // 删除旧表
      await db.execAsync('DROP TABLE IF EXISTS words');

      // 创建新表（所有字段都是可空的）
      await db.execAsync(`
        CREATE TABLE words (
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

        CREATE INDEX IF NOT EXISTS idx_words_next_review ON words(next_review);
        CREATE INDEX IF NOT EXISTS idx_words_is_mastered ON words(is_mastered);
      `);

      // 恢复数据
      if (words.length > 0) {
        for (const w of words) {
          await db.runAsync(
            `INSERT INTO words (id, word, phonetic, definition, partOfSpeech, split, mnemonic, sentence, difficulty, stability, last_review, next_review, avg_response_time, is_mastered, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              w.id, w.word, w.phonetic, w.definition, w.partOfSpeech,
              w.split, w.mnemonic, w.sentence, w.difficulty, w.stability,
              w.last_review, w.next_review, w.avg_response_time, w.is_mastered, w.created_at
            ]
          );
        }
      }

      console.log('Table recreated successfully');
    } else {
      // 检查并添加 partOfSpeech 字段
      if (!mnemonicColumn) {
        try {
          await db.execAsync('ALTER TABLE words ADD COLUMN mnemonic TEXT');
          console.log('Added mnemonic column to words table');
        } catch (error: any) {
          if (!error.message?.includes('duplicate column')) {
            throw error;
          }
        }
      }

      // 检查并添加 sentence 字段
      if (!sentenceColumn) {
        try {
          await db.execAsync('ALTER TABLE words ADD COLUMN sentence TEXT');
          console.log('Added sentence column to words table');
        } catch (error: any) {
          if (!error.message?.includes('duplicate column')) {
            throw error;
          }
        }
      }

      // 检查并添加 partOfSpeech 字段
      if (!partOfSpeechColumn) {
        try {
          await db.execAsync('ALTER TABLE words ADD COLUMN partOfSpeech TEXT');
          console.log('Added partOfSpeech column to words table');
        } catch (error: any) {
          if (!error.message?.includes('duplicate column')) {
            throw error;
          }
        }
      }

      // 数据迁移：将旧数据中的 sentence（助记句）迁移到 mnemonic 字段
      // 如果 mnemonic 为空且 sentence 有值，则将 sentence 的值复制到 mnemonic
      try {
        await db.execAsync(`
          UPDATE words 
          SET mnemonic = sentence 
          WHERE mnemonic IS NULL AND sentence IS NOT NULL AND sentence != ''
        `);
        console.log('Migrated sentence to mnemonic for words without mnemonic');
      } catch (error) {
        console.error('Failed to migrate sentence to mnemonic:', error);
      }

      // 强制修复：确保 partOfSpeech 字段存在，并为现有单词设置默认值
      try {
        // 检查 partOfSpeech 字段是否存在
        const tableInfo = await db.getAllAsync<{ name: string, type: string, notnull: number }>(
          'PRAGMA table_info(words)'
        );
        const hasPartOfSpeech = tableInfo.some(col => col.name === 'partOfSpeech');

        if (!hasPartOfSpeech) {
          console.log('partOfSpeech field missing, adding it...');
          await db.execAsync('ALTER TABLE words ADD COLUMN partOfSpeech TEXT');
          console.log('Added partOfSpeech column');
        }

        // 为所有没有词性的单词设置默认词性（如果是动词词库，默认设为 v.动词）
        // 这里先不设置默认值，让用户手动补充
        console.log('partOfSpeech field exists, no migration needed');
      } catch (error) {
        console.error('Failed to fix partOfSpeech field:', error);
      }

      // 版本 5 迁移：确保 sentence 字段正确处理
      if (currentVersion < 5) {
        console.log('Migrating to version 5: checking sentence field...');

        // 检查 sentence 字段是否存在
        const tableInfo = await db.getAllAsync<{ name: string, type: string, notnull: number }>(
          'PRAGMA table_info(words)'
        );
        const hasSentence = tableInfo.some(col => col.name === 'sentence');

        if (!hasSentence) {
          console.log('sentence field missing, adding it...');
          await db.execAsync('ALTER TABLE words ADD COLUMN sentence TEXT');
          console.log('Added sentence column to words table');
        } else {
          console.log('sentence field already exists');
        }

        console.log('Migration to version 5 completed');
      }
    }

    // 更新版本号
    await setDatabaseVersion(DB_VERSION);
    console.log(`Database migrated to version ${DB_VERSION}`);
  } catch (error) {
    console.error('Database migration failed:', error);
    // 迁移失败不应该阻止应用启动，继续运行
  }
}

// 数据库初始化
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
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

      -- 音标表（本地音标数据库）
      CREATE TABLE IF NOT EXISTS phonetics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL UNIQUE,
        phonetic TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_words_next_review ON words(next_review);
      CREATE INDEX IF NOT EXISTS idx_words_is_mastered ON words(is_mastered);
      CREATE INDEX IF NOT EXISTS idx_review_logs_word_id ON review_logs(word_id);
      CREATE INDEX IF NOT EXISTS idx_wordbook_words_wordbook_id ON wordbook_words(wordbook_id);
      CREATE INDEX IF NOT EXISTS idx_wordbook_words_word_id ON wordbook_words(word_id);
      CREATE INDEX IF NOT EXISTS idx_phonetics_word ON phonetics(word);
    `);

    console.log('Database initialized successfully');
    
    // 初始化基础音标数据
    await initDefaultPhonetics();

    // 异步导入高频100词（不阻塞数据库初始化）
    importHighFrequencyWords().catch(error => {
      console.warn('Failed to import high frequency words:', error);
    });
  }

  // 每次调用都检查是否需要迁移
  await migrateDatabase();

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
