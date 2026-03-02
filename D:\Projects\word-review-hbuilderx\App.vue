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

      // 检查是否有数据，如果没有则插入预置数据
      const count = db.executeSql(`SELECT COUNT(*) as count FROM words`)
      if (count[0].count === 0) {
        console.log('插入预置数据...')
        this.insertSampleData(db)
      }

      db.close()
      console.log('数据库初始化完成')
    },

    insertSampleData(db) {
      const now = new Date()
      const nextReviewDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const sampleWords = [
        {
          word: 'method',
          meaning: '方法',
          pronunciation: 'ˈmeθəd',
          example: 'This is a good method for learning English.',
          split_parts: 'm e th o d',
          mnemonic_sentence: '每(m)天(e)死(th)偶(o)的(d) - 每天死磕方法'
        },
        {
          word: 'review',
          meaning: '复习',
          pronunciation: 'rɪˈvjuː',
          example: 'Please review your lessons before the exam.',
          split_parts: 're view',
          mnemonic_sentence: '阿姨(re)五(view) - 阿姨复习五遍'
        },
        {
          word: 'memory',
          meaning: '记忆',
          pronunciation: 'ˈmeməri',
          example: 'I have a good memory.',
          split_parts: 'me m o ry',
          mnemonic_sentence: '我(me)每(m)偶(o)日(ry) - 我每日记忆'
        },
        {
          word: 'practice',
          meaning: '练习',
          pronunciation: 'ˈpræktɪs',
          example: 'You need to practice every day.',
          split_parts: 'pr ac t i ce',
          mnemonic_sentence: '怕(pr)阿姨(ac)替(t)我(i)策(ce)划 - 怕阿姨替我策划练习'
        },
        {
          word: 'progress',
          meaning: '进步',
          pronunciation: 'ˈprəʊɡres',
          example: 'You are making great progress.',
          split_parts: 'pro g re ss',
          mnemonic_sentence: '婆(pro)哥(g)热(re)死死(ss) - 婆哥热死死了还在进步'
        }
      ]

      sampleWords.forEach(word => {
        db.executeSql(
          `INSERT INTO words (word, meaning, pronunciation, example, split_parts, mnemonic_sentence, stability, difficulty, next_review_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            word.word,
            word.meaning,
            word.pronunciation,
            word.example,
            word.split_parts,
            word.mnemonic_sentence,
            0, // stability
            5, // difficulty
            nextReviewDate.toISOString()
          ]
        )
      })

      console.log('预置数据插入完成，共', sampleWords.length, '个单词')
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
