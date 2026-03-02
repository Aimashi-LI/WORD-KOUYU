<script>
export default {
  onLaunch: function() {
    console.log('App Launch')
    // 初始化数据库
    this.initDatabase()
  },
  onShow: function() {
    console.log('App Show')
  },
  onHide: function() {
    console.log('App Hide')
  },
  methods: {
    initDatabase() {
      // 初始化 SQLite 数据库
      const db = plus.sqlite.openDatabase({
        name: 'wordreview.db',
        path: '_doc/wordreview.db'
      })

      // 创建单词表
      db.executeSql(`
        CREATE TABLE IF NOT EXISTS words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word TEXT NOT NULL,
          meaning TEXT NOT NULL,
          pronunciation TEXT,
          example TEXT,
          split_parts TEXT,
          mnemonic_sentence TEXT,
          stability REAL DEFAULT 0,
          difficulty REAL DEFAULT 5,
          review_count INTEGER DEFAULT 0,
          mastery_level TEXT DEFAULT 'low',
          last_review_date TEXT,
          next_review_date TEXT,
          created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
      `)

      console.log('数据库初始化完成')
    }
  }
}
</script>

<style>
/*每个页面公共css */
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
}

.container {
  min-height: 100vh;
  padding: 20rpx;
}
</style>
