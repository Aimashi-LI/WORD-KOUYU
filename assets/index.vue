<template>
  <Screen :backgroundColor="theme.backgroundRoot">
    <view class="container">
      <!-- 顶部栏 -->
      <view class="top-bar">
        <view class="back-btn" @click="goBack">
          <uni-icons type="arrow-left" size="24" :color="theme.textPrimary" />
        </view>
        <text class="title">刷单词 ({{ currentIndex + 1 }}/{{ words.length }})</text>
        <view class="placeholder" />
      </view>

      <!-- 进度条 -->
      <view class="progress-container">
        <view class="progress-bar" :style="{ backgroundColor: theme.backgroundTertiary }">
          <view class="progress-fill" :style="{ width: progressPercent + '%', backgroundColor: theme.primary }" />
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading">
        <uni-load-more status="loading" />
      </view>

      <!-- 空状态 -->
      <view v-else-if="words.length === 0" class="empty">
        <uni-icons type="book" size="64" :color="theme.textMuted" />
        <text>暂无单词</text>
      </view>

      <!-- 单词卡片 (使用 swiper 实现滑动) -->
      <swiper
        v-else
        class="card-swiper"
        :current="currentIndex"
        @change="onSwiperChange"
        :indicator-dots="false"
        :autoplay="false"
        :circular="false"
      >
        <swiper-item v-for="(word, idx) in words" :key="word.id">
          <view class="card-wrapper">
            <view
              class="word-card"
              :style="{ backgroundColor: theme.backgroundDefault }"
            >
              <!-- 单词和词性 -->
              <view class="word-header">
                <view class="word-info-left">
                  <text class="word">{{ word.word }}</text>
                  <text v-if="word.partOfSpeech" class="part-of-speech">{{ word.partOfSpeech }}</text>
                </view>
                <view class="status-tags">
                  <view v-if="word.is_mastered === 1" class="mastered-tag">
                    <uni-icons type="checkmarkempty" size="14" :color="theme.success" />
                    <text>已掌握</text>
                  </view>
                  <view v-if="isWordIncomplete(word)" class="incomplete-tag">
                    <uni-icons type="compose" size="14" :color="theme.warning" />
                    <text>待编辑</text>
                  </view>
                </view>
              </view>

              <!-- 音标 -->
              <text v-if="word.phonetic" class="phonetic">{{ word.phonetic }}</text>

              <!-- 释义 -->
              <view class="definition-section">
                <text class="definition-label">释义：</text>
                <text class="definition">{{ word.definition }}</text>
              </view>

              <!-- 拆分（修改点：使用 formatSplitGroups） -->
              <view v-if="word.split" class="split-section" :style="{ backgroundColor: theme.backgroundTertiary }">
                <uni-icons type="scissors" size="16" :color="theme.accent" />
                <text class="split-label">拆分：</text>
                <text class="split-value">{{ formatSplitGroups(word.split) }}</text>
              </view>

              <!-- 助记句 -->
              <view v-if="word.mnemonic" class="mnemonic-section" :style="{ backgroundColor: theme.backgroundTertiary }">
                <uni-icons type="lightbulb" size="16" :color="theme.accent" />
                <text class="mnemonic-label">助记：</text>
                <text class="mnemonic">{{ word.mnemonic }}</text>
              </view>

              <!-- 例句 -->
              <text v-if="word.sentence" class="sentence">例句：{{ word.sentence }}</text>
            </view>
          </view>
        </swiper-item>
      </swiper>

      <!-- 分享按钮 -->
      <view class="share-btn" @click="shareCurrentWord">
        <uni-icons type="image" size="20" :color="theme.primary" />
        <text>分享卡片</text>
      </view>

      <!-- 滑动提示 -->
      <view class="hint">
        <text>← 滑动切换单词 →</text>
      </view>

      <!-- 完成学习按钮（仅在最后一个单词显示） -->
      <view v-if="currentIndex === words.length - 1" class="finish-container">
        <view class="finish-btn" :style="{ backgroundColor: theme.primary }" @click="finishBrowsing">
          <uni-icons type="checkmarkempty" size="20" color="#fff" />
          <text>完成学习</text>
        </view>
      </view>
    </view>

    <!-- 分享选项弹窗 -->
    <uni-popup ref="sharePopup" type="bottom">
      <view class="share-modal" :style="{ backgroundColor: theme.backgroundRoot }">
        <view class="share-header">
          <text>单词卡片</text>
          <uni-icons type="close" size="24" :color="theme.textMuted" @click="sharePopup.close()" />
        </view>
        <view class="share-options">
          <view class="share-option" @click="saveImageToAlbum">
            <view class="option-icon" :style="{ backgroundColor: hexToRgba(theme.primary, 0.2) }">
              <uni-icons type="image" size="24" :color="theme.primary" />
            </view>
            <view class="option-info">
              <text class="option-title">分享</text>
              <text class="option-desc">卡片以保存到手机相册</text>
            </view>
            <uni-icons type="arrow-right" size="16" :color="theme.textMuted" />
          </view>
        </view>
        <view class="share-cancel" @click="sharePopup.close()">取消</view>
      </view>
    </uni-popup>

    <!-- 创建复习项目弹窗 -->
    <uni-popup ref="projectPopup" type="bottom">
      <view class="project-modal" :style="{ backgroundColor: theme.backgroundRoot }">
        <view class="project-header">
          <text>创建复习项目</text>
          <uni-icons type="close" size="24" :color="theme.textMuted" @click="projectPopup.close()" />
        </view>
        <scroll-view scroll-y class="project-body">
          <view class="input-group">
            <text>项目名称 *</text>
            <input
              class="input"
              :style="{ backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }"
              v-model="projectName"
              placeholder="请输入项目名称"
            />
          </view>
          <view class="input-group">
            <text>项目描述</text>
            <textarea
              class="input textarea"
              :style="{ backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }"
              v-model="projectDesc"
              placeholder="请输入项目描述（可选）"
            />
          </view>
          <text class="word-count">将本次浏览的 {{ browsingWords.length }} 个单词添加到项目中</text>
        </scroll-view>
        <view class="project-footer">
          <button class="cancel-btn" @click="projectPopup.close()">取消</button>
          <button class="submit-btn" :style="{ backgroundColor: theme.primary }" @click="createProject">创建</button>
        </view>
      </view>
    </uni-popup>

    <!-- 隐藏的 Canvas，用于绘制分享卡片 -->
    <canvas
      v-if="currentWord"
      canvas-id="shareCanvas"
      id="shareCanvas"
      style="position: absolute; left: -9999px; top: 0; width: 600px; height: 800px;"
    ></canvas>
  </Screen>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useThemeStore } from '@/stores/theme';
import Screen from '@/components/Screen.vue';
import * as wordDao from '@/utils/wordDao';
import * as wordbookDao from '@/utils/wordbookDao';
// 原 formatSplit 不再使用，改为自定义 formatSplitGroups
// import { formatSplitStringForDisplay } from '@/utils/splitHelper';
import { isWordIncomplete } from '@/utils';

const themeStore = useThemeStore();
const theme = computed(() => themeStore.theme);

// 路由参数
const projectId = ref(null);
onLoad((query) => {
  if (query.projectId) projectId.value = query.projectId;
  loadWords();
});

// 数据状态
const words = ref([]);
const currentIndex = ref(0);
const loading = ref(false);
const browsingWords = ref([]); // 记录浏览过的单词ID
const projectName = ref('');
const projectDesc = ref('');
const sharePopup = ref(null);
const projectPopup = ref(null);

// 当前单词
const currentWord = computed(() => words.value[currentIndex.value] || null);

// 进度百分比
const progressPercent = computed(() => {
  if (words.value.length === 0) return 0;
  return ((currentIndex.value + 1) / words.value.length) * 100;
});

// ---------- 新增：格式化拆分，每组“字母-含义”，组间四个空格 ----------
const formatSplitGroups = (splitStr) => {
  if (!splitStr) return '';
  // 按常见分隔符（逗号、中文逗号、顿号、空格、换行）分割成组
  const groups = splitStr.split(/[，,、\s\n]+/).filter(g => g.trim() !== '');
  return groups.map(group => {
    group = group.trim();
    // 如果已包含连字符，假定格式正确，直接返回
    if (group.includes('-')) {
      return group;
    }
    // 尝试按空格分割
    const parts = group.split(/\s+/);
    if (parts.length >= 2) {
      // 第一部分作为字母，剩余部分合并为含义
      const letter = parts[0];
      const meaning = parts.slice(1).join(' ');
      return `${letter}-${meaning}`;
    } else {
      // 无法分割，整个作为字母，含义留空（展示为“字母-”）
      return `${group}-`;
    }
  }).join('    '); // 四个空格分隔组
};
// ----------------------------------------------------------------

// 加载单词
const loadWords = async () => {
  loading.value = true;
  try {
    let list = [];
    if (projectId.value) {
      list = await wordbookDao.getWordsInWordbook(parseInt(projectId.value));
    } else {
      list = await wordDao.getAllWords();
    }
    words.value = list;
    browsingWords.value = list.map(w => w.id);
    currentIndex.value = 0;
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

// swiper 切换事件
const onSwiperChange = (e) => {
  currentIndex.value = e.detail.current;
};

// 返回
const goBack = () => uni.navigateBack();

// 打开保存弹窗
const shareCurrentWord = () => {
  if (!currentWord.value) return;
  sharePopup.value.open();
};

// 生成图片并保存到相册 + 兼容式分享
const saveImageToAlbum = async () => {
  if (!currentWord.value) {
    sharePopup.value.close();
    return;
  }

  uni.showLoading({ title: '生成分享卡片...' });
  sharePopup.value.close();

  try {
    await nextTick();

    const ctx = uni.createCanvasContext('shareCanvas');
    const canvasWidth = 900;
    const canvasHeight = 1060;
    const padding = 40;
    let y = padding + 60;

    // 1. 绘制纯白背景
    ctx.setFillStyle('#FFFFFF');
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. 绘制单词（加粗大号字体）
    ctx.setFontSize(60);
    ctx.setFillStyle('#111827');
    const wordText = currentWord.value.word || 'Word';
    ctx.fillText(wordText, padding, y);
    const wordWidth = ctx.measureText(wordText).width;

    // 3. 绘制词性标签
    const posAbbr = currentWord.value.partOfSpeech || 'n';
    const posFullText = `${posAbbr}.`;
    
    ctx.setFontSize(26);
    const labelWidth = ctx.measureText(posFullText).width;
    
    ctx.setFillStyle('#EDE9FE');
    const labelRadius = 16;
    const labelX = padding + wordWidth + 20;
    const labelY = y - 35;
    const labelHeight = 40;
    
    ctx.beginPath();
    ctx.moveTo(labelX + labelRadius, labelY);
    ctx.arcTo(labelX + labelWidth + 20, labelY, labelX + labelWidth + 20, labelY + labelHeight, labelRadius);
    ctx.arcTo(labelX + labelWidth + 20, labelY + labelHeight, labelX, labelY + labelHeight, labelRadius);
    ctx.arcTo(labelX, labelY + labelHeight, labelX, labelY, labelRadius);
    ctx.closePath();
    ctx.fill();
    
    ctx.setFillStyle('#7C3AED');
    ctx.fillText(posFullText, labelX + 10, labelY + 28);
    
    y += 60;

    // 4. 绘制音标（反向显示）
    const phoneticText = currentWord.value.phonetic || '';
    const reversePhonetic = phoneticText.split('').reverse().join('');
    ctx.setFontSize(32);
    ctx.setFillStyle('#9CA3AF');
    ctx.fillText(reversePhonetic, padding, y);
    y += 50;

    // 5. 绘制释义
    ctx.setFontSize(32);
    ctx.setFillStyle('#4B5563');
    const definitionText = `释义：${currentWord.value.definition || '输入/导入'}`;
    ctx.fillText(definitionText, padding, y);
    y += 60;

    // 6. 绘制拆分模块（修改点：使用 formatSplitGroups 格式化）
    if (currentWord.value.split) {
      ctx.setFillStyle('#F9FAFB');
      const moduleRadius = 16;
      const moduleX = padding;
      const moduleY = y - 10;
      const moduleW = canvasWidth - 2 * padding;
      const moduleH = 100;
      
      ctx.beginPath();
      ctx.moveTo(moduleX + moduleRadius, moduleY);
      ctx.arcTo(moduleX + moduleW, moduleY, moduleX + moduleW, moduleY + moduleRadius, moduleRadius);
      ctx.arcTo(moduleX + moduleW, moduleY + moduleH, moduleX + moduleW - moduleRadius, moduleY + moduleH, moduleRadius);
      ctx.arcTo(moduleX, moduleY + moduleH, moduleX, moduleY + moduleH - moduleRadius, moduleRadius);
      ctx.arcTo(moduleX, moduleY, moduleX + moduleRadius, moduleY, moduleRadius);
      ctx.closePath();
      ctx.fill();

      ctx.setFillStyle('#A855F7');
      ctx.setFontSize(32);
      ctx.fillText('✂️', padding + 10, y + 25);
      
      ctx.setFontSize(28);
      ctx.setFillStyle('#4B5563');
      ctx.fillText('拆分：', padding + 50, y + 25);
      
      // 使用新函数格式化拆分内容
      let splitContent = formatSplitGroups(currentWord.value.split);
      ctx.fillText(splitContent, padding + 130, y + 25);
      y = moduleY + moduleH + 30;
    }

    // 7. 绘制助记模块
    if (currentWord.value.mnemonic) {
      ctx.setFillStyle('#F9FAFB');
      const moduleRadius = 16;
      const moduleX = padding;
      const moduleY = y - 10;
      const moduleW = canvasWidth - 2 * padding;
      const moduleH = 100;
      
      ctx.beginPath();
      ctx.moveTo(moduleX + moduleRadius, moduleY);
      ctx.arcTo(moduleX + moduleW, moduleY, moduleX + moduleW, moduleY + moduleRadius, moduleRadius);
      ctx.arcTo(moduleX + moduleW, moduleY + moduleH, moduleX + moduleW - moduleRadius, moduleY + moduleH, moduleRadius);
      ctx.arcTo(moduleX, moduleY + moduleH, moduleX, moduleY + moduleH - moduleRadius, moduleRadius);
      ctx.arcTo(moduleX, moduleY, moduleX + moduleRadius, moduleY, moduleRadius);
      ctx.closePath();
      ctx.fill();

      ctx.setFillStyle('#A855F7');
      ctx.setFontSize(32);
      ctx.fillText('💡', padding + 10, y + 25);
      
      ctx.setFontSize(28);
      ctx.setFillStyle('#4B5563');
      ctx.fillText('助记：', padding + 50, y + 25);
      
      ctx.fillText(currentWord.value.mnemonic, padding + 130, y + 25);
      y = moduleY + moduleH + 40;
    }

    // 8. 绘制底部来源
    ctx.setFontSize(24);
    ctx.setFillStyle('#9CA3AF');
    const sourceText = '来自单词学习助手';
    const sourceWidth = ctx.measureText(sourceText).width;
    ctx.fillText(sourceText, (canvasWidth - sourceWidth) / 2, canvasHeight - 40);

    // 绘制完成并保存
    ctx.draw(false, async () => {
      try {
        const tempFilePath = await new Promise((resolve, reject) => {
          uni.canvasToTempFilePath({
            canvasId: 'shareCanvas',
            fileType: 'png',
            quality: 1,
            success: (res) => resolve(res.tempFilePath),
            fail: (err) => reject(err)
          });
        });

        // 先保存到相册
        await saveTempImageToAlbum(tempFilePath);
        uni.hideLoading();

        if (uni.share && uni.share.sendWithSystem) {
          uni.showToast({ title: '卡片已保存，可分享', icon: 'success', duration: 1000 });
          
          setTimeout(() => {
            uni.share.sendWithSystem({
              type: 'image',
              href: '',
              title: `单词卡片 - ${currentWord.value.word}`,
              summary: `我在单词学习助手学到了 ${currentWord.value.word}，分享给你！`,
              imageUrl: tempFilePath,
              success: () => {
                uni.showToast({ title: '分享成功', icon: 'success' });
              },
              fail: (err) => {
                console.error('分享失败', err);
                if (!err.errMsg.includes('cancel')) {
                  uni.showToast({ title: '分享失败', icon: 'none' });
                }
              }
            });
          }, 1000);
        } else {
          uni.showModal({
            title: '分享成功',
            content: '单词卡片已保存到相册，你可以在相册中找到该图片并手动分享给好友~',
            showCancel: false,
            confirmText: '我知道了'
          });
        }

      } catch (err) {
        uni.hideLoading();
        console.error('生成失败', err);
        uni.showToast({ title: '生成失败', icon: 'none' });
      }
    });
  } catch (error) {
    uni.hideLoading();
    console.error('流程异常', error);
    uni.showToast({ title: '生成失败', icon: 'none' });
  }
};

// 保存权限方法
const saveTempImageToAlbum = async (tempFilePath) => {
  try {
    await uni.saveImageToPhotosAlbum({ filePath: tempFilePath });
  } catch (err) {
    if (err.errMsg.includes('auth deny')) {
      const settingRes = await uni.getSetting();
      if (!settingRes.authSetting['scope.writePhotosAlbum']) {
        uni.showModal({
          title: '需要相册权限',
          content: '请允许访问相册，以便保存分享卡片',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) uni.openSetting();
          }
        });
        throw new Error('权限未开启');
      }
    } else {
      throw err;
    }
  }
};

// 完成学习
const finishBrowsing = () => {
  if (projectId.value) {
    uni.navigateBack();
  } else {
    uni.showModal({
      title: '学习完成',
      content: '您已浏览完所有单词。是否要将这些单词创建为一个复习项目？',
      success: (res) => {
        if (res.confirm) {
          showCreateProject();
        } else {
          uni.navigateBack();
        }
      }
    });
  }
};

// 显示创建项目弹窗
const showCreateProject = () => {
  projectName.value = '';
  projectDesc.value = '';
  projectPopup.value.open();
};

// 创建项目
const createProject = async () => {
  if (!projectName.value.trim()) {
    uni.showToast({ title: '请输入项目名称', icon: 'none' });
    return;
  }
  try {
    const wordbookId = await wordbookDao.createWordbook(projectName.value.trim(), projectDesc.value.trim());
    for (const wordId of browsingWords.value) {
      await wordbookDao.addWordToWordbook(wordbookId, wordId);
    }
    uni.showToast({ title: '创建成功', icon: 'success' });
    projectPopup.value.close();
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (error) {
    uni.showToast({ title: '创建失败', icon: 'none' });
  }
};

// 辅助函数：将 hex 颜色转换为 rgba 字符串
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
</script>

<style scoped>
.container {
  flex: 1;
}
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
}
.back-btn, .placeholder {
  width: 80rpx;
  height: 80rpx;
}
.title {
  font-size: 36rpx;
  font-weight: 600;
  color: v-bind('theme.textPrimary');
}
.progress-container {
  padding: 0 32rpx 24rpx;
}
.progress-bar {
  height: 8rpx;
  border-radius: 4rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 4rpx;
  transition: width 0.3s;
}
.loading {
  padding: 80rpx 0;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0;
  gap: 24rpx;
  color: v-bind('theme.textMuted');
}
.card-swiper {
  flex: 1;
  min-height: 700rpx;
}
.card-wrapper {
  padding: 0 32rpx;
  box-sizing: border-box;
}
.word-card {
  border-radius: 32rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.1);
}
.word-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.word-info-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: wrap;
}
.word {
  font-size: 48rpx;
  font-weight: 700;
  color: v-bind('theme.textPrimary');
}
.part-of-speech {
  font-size: 28rpx;
  padding: 8rpx 16rpx;
  background-color: v-bind('hexToRgba(theme.primary, 0.1)');
  border-radius: 40rpx;
  color: v-bind('theme.primary');
}
.status-tags {
  display: flex;
  gap: 8rpx;
}
.mastered-tag {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  border-radius: 24rpx;
  font-size: 20rpx;
  background-color: v-bind('hexToRgba(theme.success, 0.1)');
  color: v-bind('theme.success');
}
.incomplete-tag {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  border-radius: 24rpx;
  font-size: 20rpx;
  background-color: v-bind('hexToRgba(theme.warning, 0.1)');
  color: v-bind('theme.warning');
}
.phonetic {
  font-size: 32rpx;
  color: v-bind('theme.textMuted');
  margin-bottom: 24rpx;
  text-align: center;
}
.definition-section {
  margin-bottom: 24rpx;
}
.definition-label {
  font-size: 28rpx;
  color: v-bind('theme.textMuted');
  margin-right: 8rpx;
}
.definition {
  font-size: 32rpx;
  color: v-bind('theme.textPrimary');
  line-height: 48rpx;
}
.split-section, .mnemonic-section {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
}
.split-label, .mnemonic-label {
  font-size: 28rpx;
  color: v-bind('theme.textMuted');
  white-space: nowrap;
}
.split-value, .mnemonic {
  flex: 1;
  font-size: 28rpx;
  color: v-bind('theme.textSecondary');
  line-height: 40rpx;
}
.sentence {
  font-size: 28rpx;
  color: v-bind('theme.textMuted');
  font-style: italic;
}
.share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin: 32rpx;
  padding: 24rpx;
  border-radius: 48rpx;
  background-color: v-bind('theme.backgroundTertiary');
}
.hint {
  text-align: center;
  color: v-bind('theme.textMuted');
  margin-bottom: 32rpx;
}
.finish-container {
padding: 32rpx;
}
.finish-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 24rpx;
  border-radius: 48rpx;
  color: #fff;
}
.share-modal, .project-modal {
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  padding: 32rpx;
}
.share-header, .project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}
.share-header text, .project-header text {
  font-size: 36rpx;
  font-weight: 600;
  color: v-bind('theme.textPrimary');
}
.share-options {
  margin-bottom: 32rpx;
}
.share-option {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: v-bind('theme.backgroundTertiary');
  border-radius: 16rpx;
  gap: 24rpx;
}
.option-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.option-info {
  flex: 1;
}
.option-title {
  font-size: 32rpx;
  font-weight: 600;
  color: v-bind('theme.textPrimary');
  display: block;
  margin-bottom: 8rpx;
}
.option-desc {
  font-size: 24rpx;
  color: v-bind('theme.textMuted');
}
.share-cancel {
  text-align: center;
  padding: 24rpx;
  background-color: v-bind('theme.backgroundTertiary');
  border-radius: 16rpx;
  font-size: 32rpx;
  color: v-bind('theme.textPrimary');
}
.project-body {
  max-height: 600rpx;
}
.input-group {
  margin-bottom: 24rpx;
}
.input-group text {
  display: block;
  font-size: 28rpx;
  color: v-bind('theme.textSecondary');
  margin-bottom: 8rpx;
}
.input {
  width: 100%;
  padding: 24rpx;
  border-radius: 16rpx;
  border: 2rpx solid v-bind('theme.borderLight');
  font-size: 28rpx;
}
.textarea {
  height: 160rpx;
}
.word-count {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: v-bind('theme.textMuted');
  margin: 24rpx 0;
}
.project-footer {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;
}
.project-footer button {
  flex: 1;
  padding: 24rpx;
  border-radius: 16rpx;
  font-size: 32rpx;
  border: none;
}
.cancel-btn {
  background-color: v-bind('theme.backgroundTertiary');
  color: v-bind('theme.textPrimary');
}
.submit-btn {
  color: v-bind('theme.buttonPrimaryText');
}
</style>