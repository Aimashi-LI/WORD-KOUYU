<template>
  <view class="container">
    <scroll-view scroll-y class="content" v-if="word">
      <!-- 单词信息 -->
      <view class="word-info-card">
        <view class="word-header">
          <text class="word-text">{{ word.word }}</text>
          <text class="mastery-badge" :class="'level-' + word.mastery_level">
            {{ getMasteryLabel(word.mastery_level) }}
          </text>
        </view>
        <view v-if="word.pronunciation" class="pronunciation">[{{ word.pronunciation }}]</view>
        <view class="meaning">{{ word.meaning }}</view>
      </view>

      <!-- 统计信息 -->
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-label">复习次数</text>
          <text class="stat-value">{{ word.review_count }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">稳定性</text>
          <text class="stat-value">{{ word.stability.toFixed(2) }} 天</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">难度</text>
          <text class="stat-value">{{ word.difficulty.toFixed(2) }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">下次复习</text>
          <text class="stat-value">{{ formatDate(word.next_review_date) }}</text>
        </view>
      </view>

      <!-- 例句 -->
      <view v-if="word.example" class="section-card">
        <text class="section-title">例句</text>
        <text class="example">{{ word.example }}</text>
      </view>

      <!-- 单词拆分 -->
      <view class="section-card">
        <text class="section-title">单词拆分</text>
        <view class="split-container">
          <text class="split-hint">点击字母开始拆分</text>
          <view class="split-parts">
            <text v-for="(part, index) in splitParts" :key="index" class="split-part">
              {{ part }}
            </text>
          </view>
          <view class="split-input">
            <uni-easyinput
              v-model="splitInput"
              placeholder="输入拆分后的部分，用空格分隔"
              @blur="saveSplit"
            />
          </view>
        </view>
      </view>

      <!-- 助记句 -->
      <view class="section-card">
        <text class="section-title">助记句</text>
        <view class="mnemonic-container">
          <text class="mnemonic-hint">例：王(w)阿姨(ay)教我方法</text>
          <textarea
            v-model="word.mnemonic_sentence"
            placeholder="输入助记句"
            class="mnemonic-input"
            @blur="saveMnemonic"
          />
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <button type="primary" @click="markReviewed">标记为已复习</button>
        <button type="default" @click="resetProgress">重置进度</button>
        <button type="warn" @click="deleteWord">删除单词</button>
      </view>
    </scroll-view>

    <!-- 加载中 -->
    <view v-else class="loading">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      wordId: null,
      word: null,
      splitParts: [],
      splitInput: ''
    }
  },
  onLoad(options) {
    this.wordId = options.id
    this.loadWordDetail()
  },
  methods: {
    // 加载单词详情
    loadWordDetail() {
      const db = plus.sqlite.openDatabase({
        name: 'wordreview.db',
        path: '_doc/wordreview.db'
      })

      const words = db.executeSql(
        `SELECT * FROM words WHERE id = ?`,
        [this.wordId]
      )

      db.close()

      if (words.length > 0) {
        this.word = words[0]
        if (this.word.split_parts) {
          this.splitParts = this.word.split_parts.split(' ')
          this.splitInput = this.word.split_parts
        }
      }
    },

    // 保存拆分
    saveSplit() {
      if (!this.splitInput) return

      const db = plus.sqlite.openDatabase({
        name: 'wordreview.db',
        path: '_doc/wordreview.db'
      })

      db.executeSql(
        `UPDATE words SET split_parts = ? WHERE id = ?`,
        [this.splitInput, this.wordId]
      )

      db.close()

      this.word.split_parts = this.splitInput
      this.splitParts = this.splitInput.split(' ')

      uni.showToast({
        title: '保存成功',
        icon: 'success'
      })
    },

    // 保存助记句
    saveMnemonic() {
      if (!this.word.mnemonic_sentence) return

      const db = plus.sqlite.openDatabase({
        name: 'wordreview.db',
        path: '_doc/wordreview.db'
      })

      db.executeSql(
        `UPDATE words SET mnemonic_sentence = ? WHERE id = ?`,
        [this.word.mnemonic_sentence, this.wordId]
      )

      db.close()

      uni.showToast({
        title: '保存成功',
        icon: 'success'
      })
    },

    // 标记为已复习（使用 FSRS 算法）
    markReviewed() {
      const rating = 3 // 默认为中等掌握（0-5）

      // FSRS 算法核心逻辑
      const fsrsResult = this.calculateFSRS(rating)

      const db = plus.sqlite.openDatabase({
        name: 'wordreview.db',
        path: '_doc/wordreview.db'
      })

      const now = new Date()
      const nextReviewDate = new Date(now.getTime() + fsrsResult.interval * 60 * 60 * 1000)

      db.executeSql(
        `UPDATE words SET
          stability = ?,
          difficulty = ?,
          review_count = review_count + 1,
          mastery_level = ?,
          last_review_date = ?,
          next_review_date = ?
        WHERE id = ?`,
        [
          fsrsResult.stability,
          fsrsResult.difficulty,
          fsrsResult.masteryLevel,
          now.toISOString(),
          nextReviewDate.toISOString(),
          this.wordId
        ]
      )

      db.close()

      uni.showToast({
        title: '复习完成',
        icon: 'success'
      })

      setTimeout(() => {
        uni.navigateBack()
      }, 1000)
    },

    // 重置进度
    resetProgress() {
      uni.showModal({
        title: '确认',
        content: '确定要重置这个单词的学习进度吗？',
        success: (res) => {
          if (res.confirm) {
            const db = plus.sqlite.openDatabase({
              name: 'wordreview.db',
              path: '_doc/wordreview.db'
            })

            const now = new Date()
            const nextReviewDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)

            db.executeSql(
              `UPDATE words SET
                stability = 0,
                difficulty = 5,
                review_count = 0,
                mastery_level = 'low',
                last_review_date = NULL,
                next_review_date = ?
              WHERE id = ?`,
              [nextReviewDate.toISOString(), this.wordId]
            )

            db.close()

            uni.showToast({
              title: '已重置',
              icon: 'success'
            })

            this.loadWordDetail()
          }
        }
      })
    },

    // 删除单词
    deleteWord() {
      uni.showModal({
        title: '确认',
        content: '确定要删除这个单词吗？',
        success: (res) => {
          if (res.confirm) {
            const db = plus.sqlite.openDatabase({
              name: 'wordreview.db',
              path: '_doc/wordreview.db'
            })

            db.executeSql(
              `DELETE FROM words WHERE id = ?`,
              [this.wordId]
            )

            db.close()

            uni.showToast({
              title: '已删除',
              icon: 'success'
            })

            setTimeout(() => {
              uni.navigateBack()
            }, 1000)
          }
        }
      })
    },

    // FSRS 算法计算
    calculateFSRS(rating) {
      // 当前状态
      const stability = this.word.stability || 0
      const difficulty = this.word.difficulty || 5
      const reviewCount = this.word.review_count || 0

      // 计算新的难度
      const newDifficulty = Math.max(1, Math.min(10, difficulty - 0.4 * (rating - 3)))

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
    },

    // 获取掌握程度标签
    getMasteryLabel(level) {
      const labels = {
        low: '未掌握',
        medium: '掌握中',
        high: '已掌握'
      }
      return labels[level] || '未知'
    },

    // 格式化日期
    formatDate(date) {
      if (!date) return '待安排'
      const d = new Date(date)
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.content {
  padding: 20rpx;
}

.word-info-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.word-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.word-text {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
}

.mastery-badge {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}

.level-low {
  background-color: #ffebee;
  color: #f44336;
}

.level-medium {
  background-color: #fff3e0;
  color: #ff9800;
}

.level-high {
  background-color: #e8f5e9;
  color: #4caf50;
}

.pronunciation {
  font-size: 28rpx;
  color: #1976d2;
  margin-bottom: 12rpx;
}

.meaning {
  font-size: 32rpx;
  color: #666;
  line-height: 1.6;
}

.stats-card {
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
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.section-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.example {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
}

.split-container,
.mnemonic-container {
  margin-top: 16rpx;
}

.split-hint,
.mnemonic-hint {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.split-parts {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.split-part {
  padding: 8rpx 16rpx;
  background-color: #e3f2fd;
  color: #1976d2;
  border-radius: 8rpx;
  font-size: 28rpx;
  font-weight: bold;
}

.split-input,
.mnemonic-input {
  width: 100%;
  padding: 16rpx;
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.mnemonic-input {
  min-height: 150rpx;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 20rpx 0;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-size: 32rpx;
  color: #999;
}
</style>
