<template>
  <view class="container">
    <text class="title">功能测试页面</text>
    
    <view class="test-section">
      <text class="section-title">1. plus 对象检测</text>
      <text class="result" :class="{ success: plusAvailable, error: !plusAvailable }">
        {{ plusAvailable ? '✓ plus 对象可用' : '✗ plus 对象不可用' }}
      </text>
    </view>

    <view class="test-section">
      <text class="section-title">2. SQLite 数据库检测</text>
      <button size="mini" @click="testDatabase">测试数据库</button>
      <text class="result" v-if="dbTestResult">{{ dbTestResult }}</text>
    </view>

    <view class="test-section">
      <text class="section-title">3. 单词数据</text>
      <button size="mini" @click="loadWords">加载单词</button>
      <text class="result" v-if="wordCount">共 {{ wordCount }} 个单词</text>
      <view v-if="words.length > 0" class="word-list">
        <text v-for="word in words" :key="word.id" class="word-item">
          {{ word.word }} - {{ word.meaning }}
        </text>
      </view>
    </view>

    <view class="test-section">
      <text class="section-title">4. 跳转测试</text>
      <button size="mini" @click="goToIndex">跳转到首页</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      plusAvailable: false,
      dbTestResult: '',
      wordCount: 0,
      words: []
    }
  },
  onLoad() {
    console.log('Test page loaded')
    // 检查 plus 对象
    this.plusAvailable = typeof plus !== 'undefined'
    console.log('plus available:', this.plusAvailable)
  },
  methods: {
    testDatabase() {
      console.log('Testing database...')
      this.dbTestResult = '正在测试...'

      try {
        if (!this.plusAvailable) {
          this.dbTestResult = '✗ plus 对象不可用'
          return
        }

        const db = plus.sqlite.openDatabase({
          name: 'wordreview.db',
          path: '_doc/wordreview.db'
        })

        this.dbTestResult = '✓ 数据库打开成功'
        db.close()
      } catch (error) {
        console.error('Database test failed:', error)
        this.dbTestResult = '✗ 数据库测试失败: ' + error.message
      }
    },

    loadWords() {
      console.log('Loading words...')
      
      try {
        if (!this.plusAvailable) {
          uni.showToast({
            title: 'plus 对象不可用',
            icon: 'none'
          })
          return
        }

        const db = plus.sqlite.openDatabase({
          name: 'wordreview.db',
          path: '_doc/wordreview.db'
        })

        const words = db.executeSql('SELECT id, word, meaning FROM words')
        this.words = words
        this.wordCount = words.length
        
        db.close()
        
        console.log('Words loaded:', this.wordCount)
      } catch (error) {
        console.error('Load words failed:', error)
        uni.showToast({
          title: '加载失败: ' + error.message,
          icon: 'none'
        })
      }
    },

    goToIndex() {
      console.log('Go to index')
      uni.reLaunch({
        url: '/pages/index/index'
      })
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 40rpx;
  background-color: #f5f5f5;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 60rpx;
}

.test-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.result {
  font-size: 28rpx;
  margin-top: 16rpx;
  display: block;
}

.result.success {
  color: #4caf50;
}

.result.error {
  color: #f44336;
}

.word-list {
  margin-top: 20rpx;
  max-height: 400rpx;
  overflow-y: auto;
}

.word-item {
  font-size: 28rpx;
  color: #666;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #eee;
  display: block;
}
</style>
