<template>
  <view class="container">
    <!-- 复习统计 -->
    <view class="stats-header">
      <view class="stat-item">
        <text class="stat-label">待复习</text>
        <text class="stat-value">{{ pendingCount }}</text>
      </view>
      <view class="stat-item">
        <text class="stat-label">今日已完成</text>
        <text class="stat-value">{{ completedCount }}</text>
      </view>
      <view class="stat-item">
        <text class="stat-label">掌握率</text>
        <text class="stat-value">{{ masteryRate }}%</text>
      </view>
    </view>

    <!-- 复习队列 -->
    <view v-if="reviewQueue.length > 0" class="review-card">
      <!-- 单词卡片 -->
      <view class="word-card" :class="{ 'flipped': showAnswer }">
        <!-- 正面 -->
        <view v-if="!showAnswer" class="card-front">
          <text class="word">{{ currentWord.word }}</text>
          <text v-if="currentWord.pronunciation" class="pronunciation">
            [{{ currentWord.pronunciation }}]
          </text>
        </view>

        <!-- 背面 -->
        <view v-else class="card-back">
          <text class="word">{{ currentWord.word }}</text>
          <text v-if="currentWord.pronunciation" class="pronunciation">
            [{{ currentWord.pronunciation }}]
          </text>
          <text class="meaning">{{ currentWord.meaning }}</text>

          <!-- 例句 -->
          <view v-if="currentWord.example" class="example-section">
            <text class="section-label">例句：</text>
            <text class="example">{{ currentWord.example }}</text>
          </view>

          <!-- 拆分 -->
          <view v-if="currentWord.split_parts" class="split-section">
            <text class="section-label">拆分：</text>
            <view class="split-parts">
              <text v-for="(part, index) in currentWord.split_parts.split(' ')"
                    :key="index"
                    class="split-part">
                {{ part }}
              </text>
            </view>
          </view>

          <!-- 助记句 -->
          <view v-if="currentWord.mnemonic_sentence" class="mnemonic-section">
            <text class="section-label">助记句：</text>
            <text class="mnemonic">{{ currentWord.mnemonic_sentence }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view v-if="!showAnswer" class="action-buttons">
        <button type="primary" @click="showAnswer = true">查看答案</button>
      </view>

      <!-- 评分按钮 -->
      <view v-else class="rating-buttons">
        <button type="default" @click="rateWord(0)">不记得</button>
        <button type="default" @click="rateWord(2)">模糊</button>
        <button type="default" @click="rateWord(3)">一般</button>
        <button type="default" @click="rateWord(4)">记得</button>
        <button type="primary" @click="rateWord(5)">完全记住</button>
      </view>

      <!-- 进度指示 -->
      <view class="progress-indicator">
        <text>{{ currentIndex + 1 }} / {{ reviewQueue.length }}</text>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <text class="empty-icon">🎉</text>
      <text class="empty-text">太棒了！所有单词都已复习完成</text>
      <button type="primary" @click="refreshQueue">刷新队列</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      reviewQueue: [],
      currentIndex: 0,
      showAnswer: false,
      pendingCount: 0,
      completedCount: 0,
      masteryRate: 0
    }
  },
  computed: {
    currentWord() {
      if (this.reviewQueue.length === 0) return {}
      return this.reviewQueue[this.currentIndex] || {}
    }
  },
  onLoad() {
    this.loadReviewStats()
    this.loadReviewQueue()
  },
  onShow() {
    this.loadReviewStats()
    this.loadReviewQueue()
  },
  onPullDownRefresh() {
    this.loadReviewStats()
    this.loadReviewQueue(() => {
      uni.stopPullDownRefresh()
    })
  },
  methods: {
    // 加载复习统计
    loadReviewStats() {
      try {
        const db = plus.sqlite.openDatabase({
          name: 'wordreview.db',
          path: '_doc/wordreview.db'
        })

        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        // 待复习数量
        const pending = db.executeSql(
          'SELECT COUNT(*) as count FROM words WHERE next_review_date <= ? AND mastery_level != \'high\'',
          [now.toISOString()]
        )

        // 今日已完成数量
        const completed = db.executeSql(
          'SELECT COUNT(*) as count FROM words WHERE last_review_date >= ?',
          [todayStart.toISOString()]
        )

        // 总掌握率
        const total = db.executeSql('SELECT COUNT(*) as count FROM words')
        const highMastery = db.executeSql(
          'SELECT COUNT(*) as count FROM words WHERE mastery_level = \'high\''
        )

        db.close()

        this.pendingCount = pending[0].count
        this.completedCount = completed[0].count
        this.masteryRate = total[0].count > 0
          ? Math.round((highMastery[0].count / total[0].count) * 100)
          : 0
      } catch (error) {
        console.error('加载复习统计失败:', error)
      }
    },

    // 加载复习队列（智能优先级排序）
    loadReviewQueue(callback) {
      try {
        const db = plus.sqlite.openDatabase({
          name: 'wordreview.db',
          path: '_doc/wordreview.db'
        })

        const now = new Date()

        // 智能排序：按照紧急程度（next_review_date - now）升序
        const words = db.executeSql(
          'SELECT * FROM words WHERE next_review_date <= ? AND mastery_level != \'high\' ORDER BY CASE WHEN next_review_date < ? THEN 0 ELSE 1 END, stability ASC, difficulty DESC LIMIT 20',
          [now.toISOString(), now.toISOString()]
        )

        db.close()

        this.reviewQueue = words
        this.currentIndex = 0
        this.showAnswer = false

        callback && callback()
      } catch (error) {
        console.error('加载复习队列失败:', error)
        callback && callback()
      }
    },

    // 刷新队列
    refreshQueue() {
      this.loadReviewStats()
      this.loadReviewQueue()
    },

    // 评分单词
    rateWord(rating) {
      const word = this.currentWord
      if (!word || !word.id) return

      // FSRS 算法计算
      const fsrsResult = this.calculateFSRS(rating, word)

      try {
        const db = plus.sqlite.openDatabase({
          name: 'wordreview.db',
          path: '_doc/wordreview.db'
        })

        const now = new Date()
        const nextReviewDate = new Date(now.getTime() + fsrsResult.interval * 60 * 60 * 1000)

        db.executeSql(
          'UPDATE words SET stability = ?, difficulty = ?, review_count = review_count + 1, mastery_level = ?, last_review_date = ?, next_review_date = ? WHERE id = ?',
          [
            fsrsResult.stability,
            fsrsResult.difficulty,
            fsrsResult.masteryLevel,
            now.toISOString(),
            nextReviewDate.toISOString(),
            word.id
          ]
        )

        db.close()

        // 显示反馈
        let message = ''
        switch (rating) {
          case 0:
            message = '没关系，下次加油！'
            break
          case 2:
            message = '有点模糊，继续努力'
            break
          case 3:
            message = '一般，还需加强'
            break
          case 4:
            message = '记得不错！'
            break
          case 5:
            message = '完全记住，太棒了！'
            break
        }

        uni.showToast({
          title: message,
          icon: rating >= 4 ? 'success' : 'none'
        })

        // 延迟后切换到下一个
        setTimeout(() => {
          this.nextWord()
        }, 500)
      } catch (error) {
        console.error('评分失败:', error)
        uni.showToast({
          title: '评分失败',
          icon: 'none'
        })
      }
    },

    // 下一个单词
    nextWord() {
      if (this.currentIndex < this.reviewQueue.length - 1) {
        this.currentIndex++
        this.showAnswer = false
      } else {
        // 队列完成，自动补充
        this.loadReviewQueue()
        this.loadReviewStats()

        if (this.reviewQueue.length === 0) {
          uni.showToast({
            title: '复习完成！',
            icon: 'success'
          })
        }
      }
    },

    // FSRS 算法计算
    calculateFSRS(rating, word) {
      const stability = word.stability || 0
      const difficulty = word.difficulty || 5

      // 计算新的难度
      const newDifficulty = Math.max(1, Math.min(10, difficulty - 0.4 * (rating - 2.5)))

      // 根据稳定性分段计算
      let newStability
      if (stability < 1.0) {
        // 初始期（0-1天）
        newStability = stability + 0.3 * (rating - 2.5)
      } else if (stability < 7.0) {
        // 成长期（1-7天）
        newStability = stability * (1 + 0.1 * (rating - 2.5))
      } else if (stability < 30.0) {
        // 稳定期（7-30天）
        newStability = stability * (1 + 0.05 * (rating - 2.5))
      } else {
        // 巩固期（30天以上）
        newStability = stability * (1 + 0.02 * (rating - 2.5))
      }

      // 确保稳定性至少为0.1
      newStability = Math.max(0.1, newStability)

      // 计算间隔（小时精度）
      const interval = Math.round(newStability * 24)

      // 根据稳定性确定掌握等级
      let masteryLevel
      if (newStability < 2) {
        masteryLevel = 'low'
      } else if (newStability < 10) {
        masteryLevel = 'medium'
      } else {
        masteryLevel = 'high'
      }

      return {
        stability: newStability,
        difficulty: newDifficulty,
        interval: interval,
        masteryLevel: masteryLevel
      }
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
}

.stats-header {
  display: flex;
  justify-content: space-around;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.stat-value {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}

.review-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.word-card {
  min-height: 500rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  perspective: 1000rpx;
}

.card-front,
.card-back {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40rpx;
}

.word {
  font-size: 56rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
  text-align: center;
}

.pronunciation {
  font-size: 32rpx;
  color: #1976d2;
  margin-bottom: 24rpx;
}

.meaning {
  font-size: 36rpx;
  color: #666;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 32rpx;
}

.example-section,
.split-section,
.mnemonic-section {
  width: 100%;
  margin-top: 24rpx;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
}

.section-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.example,
.mnemonic {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
}

.split-parts {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.split-part {
  padding: 8rpx 16rpx;
  background-color: #e3f2fd;
  color: #1976d2;
  border-radius: 8rpx;
  font-size: 28rpx;
  font-weight: bold;
}

.action-buttons,
.rating-buttons {
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.rating-buttons {
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
}

.rating-buttons button {
  flex: 1;
  min-width: 120rpx;
  margin: 0 4rpx;
}

.progress-indicator {
  text-align: center;
  margin-top: 32rpx;
  font-size: 28rpx;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #666;
  text-align: center;
  margin-bottom: 40rpx;
}
</style>
