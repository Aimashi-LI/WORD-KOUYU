/**
 * 在浏览器控制台中执行此脚本来删除所有单词
 *
 * 使用方法：
 * 1. 打开应用（http://localhost:5000）
 * 2. 按 F12 打开开发者工具
 * 3. 复制整个脚本内容，粘贴到 Console 标签中
 * 4. 按回车执行
 */

(async function deleteAllWords() {
  console.log('开始删除所有单词...');

  try {
    // 打开 IndexedDB
    const request = indexedDB.open('expo-sqlite:wordmaster.db', 1);

    request.onerror = (event) => {
      console.error('无法打开 IndexedDB:', event);
      throw new Error('无法打开 IndexedDB');
    };

    const db = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log('IndexedDB 已打开');

    // 获取对象存储名称
    const objectStores = Array.from(db.objectStoreNames);
    console.log('可用的对象存储:', objectStores);

    // 删除 wordbook_words 表的记录
    if (objectStores.includes('wordbook_words')) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('wordbook_words', 'readwrite');
        const store = tx.objectStore('wordbook_words');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      console.log('已删除 wordbook_words 表的所有记录');
    }

    // 删除 review_logs 表的记录
    if (objectStores.includes('review_logs')) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('review_logs', 'readwrite');
        const store = tx.objectStore('review_logs');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      console.log('已删除 review_logs 表的所有记录');
    }

    // 删除 words 表的记录
    if (objectStores.includes('words')) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('words', 'readwrite');
        const store = tx.objectStore('words');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      console.log('已删除 words 表的所有记录');
    }

    // 更新 wordbooks 表的单词数为 0
    if (objectStores.includes('wordbooks')) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('wordbooks', 'readwrite');
        const store = tx.objectStore('wordbooks');
        const request = store.getAll();
        request.onsuccess = () => {
          const wordbooks = request.result;
          wordbooks.forEach(wb => {
            wb.word_count = 0;
            store.put(wb);
          });
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
      console.log('已更新所有词库的单词数为 0');
    }

    db.close();
    console.log('✅ 所有单词已成功删除！');
    console.log('⚠️  请刷新页面以查看效果');

  } catch (error) {
    console.error('❌ 删除失败:', error);
  }
})();
