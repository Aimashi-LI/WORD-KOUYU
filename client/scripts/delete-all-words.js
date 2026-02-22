// 删除所有单词的脚本
import * as SQLite from 'expo-sqlite';

async function deleteAllWords() {
  try {
    const db = await SQLite.openDatabaseAsync('wordmaster.db');

    // 1. 获取所有单词ID
    const words = await db.getAllAsync('SELECT id FROM words');
    console.log('当前数据库中的单词数量:', words.length);

    if (words.length === 0) {
      console.log('数据库中没有单词，无需删除');
      return;
    }

    const ids = words.map(w => w.id);
    console.log('准备删除的单词IDs:', ids);

    // 2. 删除关联表中的记录
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM wordbook_words WHERE word_id IN (${placeholders})`,
      ids
    );
    console.log('已删除 wordbook_words 关联记录');

    // 3. 删除复习日志
    await db.runAsync(
      `DELETE FROM review_logs WHERE word_id IN (${placeholders})`,
      ids
    );
    console.log('已删除复习日志');

    // 4. 删除单词
    await db.runAsync(
      `DELETE FROM words WHERE id IN (${placeholders})`,
      ids
    );
    console.log('已删除单词');

    // 5. 更新所有词库的单词数
    const wordbooks = await db.getAllAsync('SELECT id FROM wordbooks');
    for (const wb of wordbooks) {
      const countResult = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM wordbook_words WHERE wordbook_id = ?',
        [wb.id]
      );
      await db.runAsync(
        'UPDATE wordbooks SET word_count = ? WHERE id = ?',
        [countResult.count, wb.id]
      );
    }
    console.log('已更新所有词库的单词数');

    // 6. 验证删除结果
    const remainingWords = await db.getAllAsync('SELECT COUNT(*) as count FROM words');
    console.log('删除后剩余的单词数量:', remainingWords[0].count);

    await db.closeAsync();
    console.log('删除操作完成！');
  } catch (error) {
    console.error('删除失败:', error);
    throw error;
  }
}

// 执行删除
deleteAllWords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
