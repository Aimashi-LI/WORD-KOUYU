<template>
  <view class="container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>

    <!-- 搜索栏 -->
    <view v-else class="search-bar">
      <input
        v-model="searchText"
        placeholder="搜索单词..."
        class="search-input"
        @confirm="handleSearch"
      />
    </view>

    <!-- 排序按钮 -->
    <view v-if="!loading" class="sort-buttons">
      <button size="mini" :type="sortBy === 'next_review' ? 'primary' : 'default'" @click="setSort('next_review')">按复习时间</button>
      <button size="mini" :type="sortBy === 'stability' ? 'primary' : 'default'" @click="setSort('stability')">按掌握程度</button>
      <button size="mini" :type="sortBy === 'review_count' ? 'primary' : 'default'" @click="setSort('review_count')">按复习次数</button>
    </view>

    <!-- 单词列表 -->
    <scroll-view v-if="!loading" scroll-y="true" class="word-list" @scrolltolower="loadMore">
      <view v-if="wordList.length === 0" class="empty-state">
        <text>暂无单词，点击下方按钮添加</text>
      </view>
      <view v-else>
        <view v-for="word in wordList" :key="word.id" class="word-item" @click="goToDetail(word.id)">
          <view class="word-header">
            <text class="word-text">{{ word.word }}</text>
            <text class="mastery-level" :class="'level-' + word.mastery_level">
              {{ getMasteryLabel(word.mastery_level) }}
            </text>
          </view>
          <view class="word-meaning">{{ word.meaning }}</view>
          <view class="word-info">
            <text v-if="word.pronunciation" class="pronunciation">[{{ word.pronunciation }}]</text>
            <text class="next-review">下次复习: {{ formatNextReview(word.next_review_date) }}</text>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more">
        <text>加载中...</text>
      </view>
      <view v-if="!hasMore && wordList.length > 0" class="no-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- 添加单词按钮 -->
    <view v-if="!loading" class="add-button">
      <button type="primary" @click="showAddModal">+ 添加单词</button>
    </view>

    <!-- 添加单词弹窗 -->
    <view v-if="modalVisible" class="modal-mask" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">添加单词</text>
          <text class="modal-close" @click="closeModal">×</text>
        </view>
        <scroll-view scroll-y="true" class="modal-body">
          <view class="form-item">
            <text class="form-label">单词：</text>
            <input v-model="formData.word" placeholder="请输入单词" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">含义：</text>
            <input v-model="formData.meaning" placeholder="请输入含义" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">发音：</text>
            <input v-model="formData.pronunciation" placeholder="请输入发音" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">例句：</text>
            <textarea v-model="formData.example" placeholder="请输入例句" class="form-textarea"></textarea>
          </view>
          <view class="form-item">
            <text class="form-label">拆分：</text>
            <input v-model="formData.split_parts" placeholder="点击字母开始拆分" class="form-input" />
          </view>
          <view class="form-item">
            <text class="form-label">助记：</text>
            <input v-model="formData.mnemonic_sentence" placeholder="例：王(w)阿姨(ay)教我方法" class="form-input" />
          </view>
        </scroll-view>
        <view class="modal-footer">
          <button type="default" size="mini" @click="closeModal" class="cancel-btn">取消</button>
          <button type="primary" size="mini" @click="handleSave" class="save-btn">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loading: true,
      wordList: [],
      searchText: '',
      sortBy: 'next_review',
      page: 1,
      pageSize: 20,
      hasMore: true,
      editingId: null,
      modalVisible: false,
      formData: {
        word: '',
        meaning: '',
        pronunciation: '',
        example: '',
        split_parts: '',
        mnemonic_sentence: ''
      }
    }
  },
  onLoad() {
    console.log('Index page loaded')
    // 延迟加载数据，确保数据库已初始化
    setTimeout(() => {
      this.loadWordList()
    }, 1500)
  },
  onPullDownRefresh() {
    console.log('Pull down refresh')
    this.page = 1
    this.wordList = []
    this.hasMore = true
    this.loadWordList(() => {
      uni.stopPullDownRefresh()
    })
  },
  methods: {
    // 加载单词列表
    loadWordList(callback) {
      console.log('Loading word list...')
      
      try {
        // 检查 plus 对象是否可用
        if (typeof plus === 'undefined') {
          console.log('plus 对象不可用')
          uni.showToast({
            title: '数据库不可用',
            icon: 'none'
          })
          this.loading = false
          callback && callback()
          return
        }

        const db = plus.sqlite.openDatabase({
          name: 'wordreview.db',
          path: '_doc/wordreview.db'
        })

        console.log('Database opened')

        let sql = 'SELECT * FROM words WHERE 1=1'
        const params = []

        if (this.searchText) {
          sql += ' AND word LIKE ?'
          params.push('%' + this.searchText + '%')
        }

        // 排序
        switch (this.sortBy) {
          case 'next_review':
            sql += ' ORDER BY next_review_date ASC'
            break
          case 'stability':
            sql += ' ORDER BY stability DESC'
            break
          case 'review_count':
            sql += ' ORDER BY review_count DESC'
            break
        }

        sql += ' LIMIT ' + this.pageSize + ' OFFSET ' + ((this.page - 1) * this.pageSize)

        console.log('SQL:', sql)
        console.log('Params:', params)

        const words = db.executeSql(sql, params)
        console.log('Words loaded:', words.length)
        
        db.close()

        if (words.length < this.pageSize) {
          this.hasMore = false
        }

        if (this.page === 1) {
          this.wordList = words
        } else {
          this.wordList = [...this.wordList, ...words]
        }

        console.log('Word list updated:', this.wordList.length)
        this.loading = false
      } catch (error) {
        console.error('加载单词列表失败:', error)
        uni.showToast({
          title: '加载失败: ' + error.message,
          icon: 'none'
        })
        this.loading = false
      }

      callback && callback()
    },

    // 加载更多
    loadMore() {
      console.log('Loading more...')
      if (!this.hasMore) return
      this.page++
      this.loadWordList()
    },

    // 搜索
    handleSearch() {
      console.log('Searching:', this.searchText)
      this.page = 1
      this.wordList = []
      this.hasMore = true
      this.loadWordList()
    },

    // 设置排序
    setSort(sortBy) {
      console.log('Set sort:', sortBy)
      this.sortBy = sortBy
      this.page = 1
      this.wordList = []
      this.hasMore = true
      this.loadWordList()
    },

    // 跳转到详情页
    goToDetail(id) {
      console.log('Go to detail:', id)
      uni.navigateTo({
        url: '/pages/detail/detail?id=' + id
      })
    },

    // 显示添加弹窗
    showAddModal() {
      console.log('Show add modal')
      this.editingId = null
      this.formData = {
        word: '',
        meaning: '',
        pronunciation: '',
        example: '',
        split_parts: '',
        mnemonic_sentence: ''
      }
      this.modalVisible = true
    },

    // 关闭弹窗
    closeModal() {
      console.log('Close modal')
      this.modalVisible = false
    },

    // 保存单词
    handleSave() {
      console.log('Save word:', this.formData)
      if (!this.formData.word || !this.formData.meaning) {
        uni.showToast({
          title: '请填写单词和含义',
          icon: 'none'
        })
        return
      }

      try {
        if (typeof plus === 'undefined') {
          uni.showToast({
            title: '数据库不可用',
            icon: 'none'
          })
          return
        }

        const db = plus.sqlite.openDatabase({
          name: 'wordreview.db',
          path: '_doc/wordreview.db'
        })

        const now = new Date()
        const nextReviewDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)

        db.executeSql(
          'INSERT INTO words (word, meaning, pronunciation, example, split_parts, mnemonic_sentence, stability, difficulty, next_review_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            this.formData.word,
            this.formData.meaning,
            this.formData.pronunciation || null,
            this.formData.example || null,
            this.formData.split_parts || null,
            this.formData.mnemonic_sentence || null,
            0, // stability
            5, // difficulty
            nextReviewDate.toISOString()
          ]
        )

        db.close()

        uni.showToast({
          title: '添加成功',
          icon: 'success'
        })

        this.closeModal()
        this.page = 1
        this.wordList = []
        this.hasMore = true
        this.loadWordList()
      } catch (error) {
        console.error('保存单词失败:', error)
        uni.showToast({
          title: '保存失败: ' + error.message,
          icon: 'none'
        })
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

    // 格式化下次复习时间
    formatNextReview(date) {
      if (!date) return '待安排'
      const d = new Date(date)
      const now = new Date()
      const diff = d - now
      const days = Math.floor(diff / (24 * 60 * 60 * 1000))

      if (days < 0) return '立即复习'
      if (days === 0) return '今天'
      if (days === 1) return '明天'
      return days + '天后'
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding-bottom: 100rpx;
  background-color: #f5f5f5;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-size: 32rpx;
  color: #999;
}

.search-bar {
  padding: 20rpx;
  background-color: #fff;
}

.search-input {
  width: 100%;
  padding: 16rpx;
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
  background-color: #f9f9f9;
}

.sort-buttons {
  display: flex;
  justify-content: space-around;
  padding: 20rpx;
  background-color: #fff;
  margin-bottom: 20rpx;
  gap: 12rpx;
}

.word-list {
  padding: 0 20rpx;
  height: calc(100vh - 350rpx);
}

.empty-state {
  text-align: center;
  padding: 80rpx 20rpx;
  color: #999;
  font-size: 28rpx;
}

.word-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.word-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.word-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.mastery-level {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
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

.word-meaning {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.word-info {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #999;
}

.pronunciation {
  color: #1976d2;
}

.next-review {
  color: #4caf50;
}

.load-more,
.no-more {
  text-align: center;
  padding: 40rpx;
  color: #999;
}

.add-button {
  position: fixed;
  bottom: 100rpx;
  left: 0;
  right: 0;
  padding: 20rpx;
  background-color: #fff;
  border-top: 2rpx solid #eee;
}

/* 弹窗样式 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.modal-content {
  width: 600rpx;
  max-height: 80vh;
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 2rpx solid #eee;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.modal-close {
  font-size: 48rpx;
  color: #999;
  padding: 0 16rpx;
  cursor: pointer;
}

.modal-body {
  max-height: 500rpx;
  padding: 24rpx;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  padding: 16rpx;
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
  background-color: #fff;
}

.form-textarea {
  width: 100%;
  min-height: 150rpx;
  padding: 16rpx;
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
  background-color: #fff;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  border-top: 2rpx solid #eee;
  gap: 20rpx;
}

.cancel-btn,
.save-btn {
  flex: 1;
}
</style>
