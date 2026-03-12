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
          <view 
            class="progress-fill" 
            :style="{ 
              width: progressPercent + '%', 
              backgroundColor: theme.primary 
            }" 
          />
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading">
        <uni-load-more status="loading" />
      </view>

      <!-- 空状态 -->
      <view v-else-if="words.length === 0" class="empty">
        <uni-icons type="book" size="64" :color="theme.textMuted" />
        <text class="empty-text">暂无单词</text>
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
        :snap-to-edge="true"
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
                  <text v-if="word.partOfSpeech" class="part-of-speech">
                    {{ word.partOfSpeech }}
                  </text>
                  <view 
                    v-else 
                    class="add-part-of-speech" 
                    @click="goToDetail(word.id)"
                  >
                    <text class="add-text">+ 词性</text>
                  </view>
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

              <!-- 拆分 -->
              <view v-if="word.split" class="split-section" :style="{ backgroundColor: theme.backgroundTertiary }">
                <uni-icons type="scissors" size="16" :color="theme.accent" />
                <view class="split-row">
                  <text class="split-label">拆分：</text>
                  <text class="split-value">{{ formatSplit(word.split) }}</text>
                </view>
              </view>

              <!-- 助记句 -->
              <view v-if="word.mnemonic" class="mnemonic-section" :style="{ backgroundColor: theme.backgroundTertiary }">
                <uni-icons type="lightbulb" size="16" :color="theme.accent" />
                <text class="mnemonic-text">
                  <text class="mnemonic-label">助记：</text>{{ word.mnemonic }}
                </text>
              </view>
              <view 
                v-else 
                class="mnemonic-section add-hint-section" 
                :style="{ backgroundColor: theme.backgroundTertiary }" 
                @click="goToDetail(word.id)"
              >
                <uni-icons type="lightbulb" size="16" :color="theme.primary" />
                <text class="mnemonic-text add-hint">+ 助记句</text>
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
      <view class="hint-container">
        <text class="hint-text">← 滑动切换单词 →</text>
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
    <uni-popup ref="sharePopupRef" type="bottom">
      <view class="share-modal" :style="{ backgroundColor: theme.backgroundRoot }">
        <view class="share-header">
          <text class="header-title">单词卡片</text>
          <uni-icons 
            type="close" 
            size="24" 
            :color="theme.textMuted" 
            @click="closeSharePopup" 
          />
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
        <view class="share-cancel" @click="closeSharePopup">取消</view>
      </view>
    </uni-popup>

    <!-- 创建复习项目弹窗 -->
    <uni-popup ref="projectPopupRef" type="bottom">
      <view class="project-modal" :style="{ backgroundColor: theme.backgroundRoot }">
        <view class="project-header">
          <text class="header-title">创建复习项目</text>
          <uni-icons 
            type="close" 
            size="24" 
            :color="theme.textMuted" 
            @click="closeProjectPopup" 
          />
        </view>
        <scroll-view scroll-y class="project-body">
          <view class="input-group">
            <text class="input-label">项目名称 *</text>
            <input
              class="input"
              :style="{ backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }"
              v-model="projectName"
              placeholder="请输入项目名称"
              placeholder-class="input-placeholder"
            />
          </view>
          <view class="input-group">
            <text class="input-label">项目描述</text>
            <textarea
              class="input textarea"
              :style="{ backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }"
              v-model="projectDesc"
              placeholder="请输入项目描述（可选）"
              placeholder-class="input-placeholder"
            />
          </view>
          <text class="word-count">
            将本次浏览的 {{ browsingWords.length }} 个单词添加到项目中
          </text>
        </scroll-view>
        <view class="project-footer">
          <button class="cancel-btn" @click="closeProjectPopup">取消</button>
          <button 
            class="submit-btn" 
            :style="{ backgroundColor: theme.primary }" 
            @click="createProject"
          >
            创建
          </button>
        </view>
      </view>
    </uni-popup>

    <!-- 隐藏的 Canvas，用于绘制分享卡片 -->
    <canvas
      v-if="currentWord"
      canvas-id="shareCanvas"
      id="shareCanvas"
      style="position: fixed; left: -9999px; top: 0; width: 700px; height: 1150px;"
    ></canvas>
  </Screen>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useThemeStore } from '@/stores/theme';
import Screen from '@/components/Screen.vue';
import * as wordDao from '@/utils/wordDao';
import * as wordbookDao from '@/utils/wordbookDao';
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
const browsingWords = ref([]);
const projectName = ref('');
const projectDesc = ref('');
const sharePopupRef = ref(null);
const projectPopupRef = ref(null);

// 当前单词
const currentWord = computed(() => words.value[currentIndex.value] || null);

// 进度百分比
const progressPercent = computed(() => {
  if (words.value.length === 0) return 0;
  return ((currentIndex.value + 1) / words.value.length) * 100;
});

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
    console.error('[loadWords] 加载单词失败:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

// 格式化拆分显示
const formatSplit = (splitStr) => {
  if (!splitStr || !splitStr.trim()) {
    return '';
  }

  try {
    // 使用 '。' 分割每一组
    const groups = splitStr.split('。').filter(g => g.trim());

    // 对每一组，使用 ',' 分割英文和中文，然后用 '-' 连接
    const formattedGroups = groups.map(group => {
      const parts = group.split(',');
      if (parts.length >= 2) {
        const code = parts[0].trim();
        const content = parts.slice(1).join(',').trim();
        return `${code}-${content}`;
      } else if (parts.length === 1) {
        // 如果只有一部分，直接返回（容错处理）
        return parts[0].trim();
      }
      return '';
    });

    // 使用四个空格连接所有组
    return formattedGroups.filter(g => g).join('    ');
  } catch (error) {
    console.error('格式化拆分字符串失败:', error);
    return splitStr; // 格式化失败时返回原字符串
  }
};

// swiper 切换事件
const onSwiperChange = (e) => {
  currentIndex.value = e.detail.current;
};

// 返回
const goBack = () => uni.navigateBack();

// 跳转到详情页
const goToDetail = (wordId) => {
  uni.navigateTo({
    url: `/pages/word-detail?id=${wordId}`
  });
};

// 关闭分享弹窗
const closeSharePopup = () => {
  sharePopupRef.value?.close();
};

// 关闭项目弹窗
const closeProjectPopup = () => {
  projectPopupRef.value?.close();
};

// 打开分享弹窗
const shareCurrentWord = () => {
  if (!currentWord.value) return;
  sharePopupRef.value?.open();
};

// 文本自动换行函数（基于最大字符数限制）
function wrapTextByChars(ctx, text, maxWidth, fontSize, maxCharsPerLine) {
  const chars = text.split('');
  const lines = [];
  let currentLine = '';
  let currentLineChars = 0;

  ctx.setFontSize(fontSize);

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    const widthExceeded = testWidth > maxWidth;
    const charCountExceeded = currentLineChars >= maxCharsPerLine;

    if ((widthExceeded || charCountExceeded) && currentLineChars > 0) {
      lines.push(currentLine);
      currentLine = char;
      currentLineChars = 1;
    } else {
      currentLine = testLine;
      currentLineChars++;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// 生成图片并保存到相册
const saveImageToAlbum = async () => {
  if (!currentWord.value) {
    closeSharePopup();
    return;
  }

  uni.showLoading({ title: '生成分享卡片...' });
  closeSharePopup();

  try {
    await nextTick();

    const ctx = uni.createCanvasContext('shareCanvas');
    const canvasWidth = 700;
    const canvasHeight = 1150;
    const padding = 45;
    let y = padding + 25;

    // 1. 绘制纯白背景
    ctx.setFillStyle('#FFFFFF');
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. 绘制单词（加粗大号字体）
    ctx.setFontSize(48);
    ctx.setFillStyle('#1F2937');
    const wordText = currentWord.value.word || 'Word';
    ctx.fillText(wordText, padding, y);
    const wordWidth = ctx.measureText(wordText).width;

    // 3. 绘制词性标签
    if (currentWord.value.partOfSpeech) {
      const posText = currentWord.value.partOfSpeech;
      ctx.setFontSize(20);
      const posWidth = ctx.measureText(posText).width;

      ctx.setFillStyle('rgba(99, 102, 241, 0.1)');
      const posPadding = 10;
      const posHeight = 32;
      const posX = padding + wordWidth + 10;
      const posY = y - 26;
      const radius = 10;

      ctx.beginPath();
      ctx.moveTo(posX + radius, posY);
      ctx.arcTo(posX + posWidth + posPadding * 2, posY, posX + posWidth + posPadding * 2, posY + posHeight, radius);
      ctx.arcTo(posX + posWidth + posPadding * 2, posY + posHeight, posX, posY + posHeight, radius);
      ctx.arcTo(posX, posY + posHeight, posX, posY, radius);
      ctx.arcTo(posX, posY, posX + radius, posY, radius);
      ctx.closePath();
      ctx.fill();

      ctx.setFillStyle('#6366F1');
      ctx.fillText(posText, posX + posPadding, posY + 22);
    }

    y += 60;

    // 4. 音标
    if (currentWord.value.phonetic) {
      ctx.setFontSize(22);
      ctx.setFillStyle('#6B7280');
      ctx.fillText(currentWord.value.phonetic, padding, y);
      y += 50;
    }

    // 5. 释义
    const definitionText = `${currentWord.value.definition || '输入/导入'}`;
    const definitionMaxWidth = canvasWidth - padding * 2;
    const definitionLines = wrapTextByChars(ctx, definitionText, definitionMaxWidth, 36, 15);

    definitionLines.forEach(line => {
      ctx.setFontSize(36);
      ctx.setFillStyle('#1F2937');
      ctx.fillText(`释义：${line}`, padding, y);
      y += 42;
    });
    y += 30;

    // 6. 拆分
    if (currentWord.value.split) {
      ctx.setFillStyle('#F9FAFB');
      const splitHeight = 140;
      const splitY = y - 12;
      const radius = 10;

      ctx.beginPath();
      ctx.moveTo(padding + radius, splitY);
      ctx.arcTo(canvasWidth - padding, splitY, canvasWidth - padding, splitY + radius, radius);
      ctx.arcTo(canvasWidth - padding, splitY + splitHeight, canvasWidth - padding - radius, splitY + splitHeight, radius);
      ctx.arcTo(padding, splitY + splitHeight, padding, splitY + splitHeight - radius, radius);
      ctx.arcTo(padding, splitY, padding + radius, splitY, radius);
      ctx.closePath();
      ctx.fill();

      ctx.setFillStyle('#8B5CF6');
      ctx.setFontSize(24);
      ctx.fillText('✂️', padding + 10, y + 16);

      ctx.setFontSize(20);
      ctx.setFillStyle('#6B7280');
      ctx.fillText('拆分：', padding + 40, y + 16);

      const splitContent = formatSplit(currentWord.value.split);
      const splitMaxWidth = canvasWidth - padding * 2 - 85;
      const splitLines = wrapTextByChars(ctx, splitContent, splitMaxWidth, 32, 15);

      splitLines.forEach((line, index) => {
        ctx.setFontSize(32);
        ctx.setFillStyle('#374151');
        ctx.fillText(line, padding + 95, y + 16 + index * 38);
      });

      y = splitY + splitHeight + 30;
    }

    // 7. 助记
    if (currentWord.value.mnemonic) {
      ctx.setFillStyle('#F9FAFB');
      const mnemonicHeight = 140;
      const mnemonicY = y - 12;
      const radius = 10;

      ctx.beginPath();
      ctx.moveTo(padding + radius, mnemonicY);
      ctx.arcTo(canvasWidth - padding, mnemonicY, canvasWidth - padding, mnemonicY + radius, radius);
      ctx.arcTo(canvasWidth - padding, mnemonicY + mnemonicHeight, canvasWidth - padding - radius, mnemonicY + mnemonicHeight, radius);
      ctx.arcTo(padding, mnemonicY + mnemonicHeight, padding, mnemonicY + mnemonicHeight - radius, radius);
      ctx.arcTo(padding, mnemonicY, padding + radius, mnemonicY, radius);
      ctx.closePath();
      ctx.fill();

      ctx.setFillStyle('#8B5CF6');
      ctx.setFontSize(24);
      ctx.fillText('💡', padding + 10, y + 16);

      ctx.setFontSize(20);
      ctx.setFillStyle('#6B7280');
      ctx.fillText('助记：', padding + 40, y + 16);

      const mnemonicContent = currentWord.value.mnemonic;
      const mnemonicMaxWidth = canvasWidth - padding * 2 - 85;
      const mnemonicLines = wrapTextByChars(ctx, mnemonicContent, mnemonicMaxWidth, 32, 15);

      mnemonicLines.forEach((line, index) => {
        ctx.setFontSize(32);
        ctx.setFillStyle('#374151');
        ctx.fillText(line, padding + 95, y + 16 + index * 38);
      });

      y = mnemonicY + mnemonicHeight + 30;
    }

    // 8. 例句
    if (currentWord.value.sentence) {
      const sentenceText = currentWord.value.sentence;
      const sentenceMaxWidth = canvasWidth - padding * 2;
      const sentenceLines = wrapTextByChars(ctx, sentenceText, sentenceMaxWidth, 30, 15);

      sentenceLines.forEach(line => {
        ctx.setFontSize(30);
        ctx.setFillStyle('#374151');
        ctx.fillText(`例句：${line}`, padding, y);
        y += 36;
      });
      y += 30;
    }

    // 9. 底部分割线
    ctx.setFillStyle('#E5E7EB');
    ctx.fillRect(padding, y, canvasWidth - padding * 2, 1);
    y += 50;

    // 10. 底部信息
    ctx.setFontSize(16);
    ctx.setFillStyle('#9CA3AF');
    const footerText = '来自单词学习助手';
    const footerWidth = ctx.measureText(footerText).width;
    ctx.fillText(footerText, (canvasWidth - footerWidth) / 2, canvasHeight - 30);

    // 绘制 Canvas 并生成图片
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

        await saveTempImageToAlbum(tempFilePath);
        uni.hideLoading();

        // 尝试调用系统分享
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
    // 在词库中刷单词，直接返回
    uni.navigateBack();
  } else {
    // 浏览所有单词，询问是否创建项目
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
  projectPopupRef.value?.open();
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
    closeProjectPopup();
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (error) {
    console.error('[createProject] 创建失败:', error);
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
  display: flex;
  flex-direction: column;
}

/* 顶部栏 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
}

.back-btn, .placeholder {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: v-bind('theme.textPrimary');
}

/* 进度条 */
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

/* 加载和空状态 */
.loading {
  padding: 80rpx 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
  gap: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: v-bind('theme.textMuted');
}

/* Swiper */
.card-swiper {
  flex: 1;
  padding: 0 20rpx 24rpx;
}

.card-wrapper {
  padding: 24rpx;
}

.word-card {
  border-radius: 32rpx;
  padding: 40rpx 40rpx 200rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 单词头部 */
.word-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.add-part-of-speech {
  padding: 8rpx 16rpx;
  background-color: v-bind('theme.backgroundTertiary');
  border-radius: 40rpx;
}

.add-text {
  font-size: 28rpx;
  color: v-bind('theme.textMuted');
}

/* 状态标签 */
.status-tags {
  display: flex;
  gap: 8rpx;
}

.mastered-tag, .incomplete-tag {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  border-radius: 24rpx;
  font-size: 20rpx;
}

.mastered-tag {
  background-color: v-bind('hexToRgba(theme.success, 0.1)');
  color: v-bind('theme.success');
}

.incomplete-tag {
  background-color: v-bind('hexToRgba(theme.warning, 0.1)');
  color: v-bind('theme.warning');
}

/* 音标 */
.phonetic {
  font-size: 32rpx;
  color: v-bind('theme.textMuted');
  text-align: center;
}

/* 释义 */
.definition-section {
  display: flex;
  flex-direction: row;
  gap: 8rpx;
}

.definition-label {
  font-size: 28rpx;
  color: v-bind('theme.textMuted');
}

.definition {
  font-size: 32rpx;
  color: v-bind('theme.textPrimary');
  line-height: 48rpx;
  flex: 1;
}

/* 拆分 */
.split-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  border-radius: 24rpx;
}

.split-row {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
}

.split-label {
  font-size: 28rpx;
  color: v-bind('theme.textMuted');
  min-width: 120rpx;
}

.split-value {
  flex: 1;
  font-size: 28rpx;
  color: v-bind('theme.textSecondary');
}

/* 助记 */
.mnemonic-section {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16rpx;
  padding: 24rpx;
  border-radius: 24rpx;
}

.add-hint-section {
  cursor: pointer;
}

.mnemonic-text {
  flex: 1;
  font-size: 28rpx;
  color: v-bind('theme.textSecondary');
  line-height: 44rpx;
}

.mnemonic-label {
  font-size: 28rpx;
  color: v-bind('theme.textMuted');
}

.add-hint {
  color: v-bind('theme.primary');
}

/* 例句 */
.sentence {
  font-size: 28rpx;
  color: v-bind('theme.textMuted');
  font-style: italic;
  line-height: 44rpx;
}

/* 分享按钮 */
.share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 24rpx;
  border-radius: 48rpx;
  background-color: v-bind('theme.backgroundTertiary');
  margin: 0 32rpx 16rpx;
}

.share-btn text {
  font-size: 28rpx;
  color: v-bind('theme.primary');
}

/* 滑动提示 */
.hint-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 0;
}

.hint-text {
  font-size: 24rpx;
  color: v-bind('theme.textMuted');
}

/* 完成按钮 */
.finish-container {
  padding: 0 32rpx 32rpx;
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

.finish-btn text {
  font-size: 32rpx;
}

/* 分享弹窗 */
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

.header-title {
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

/* 项目弹窗 */
.project-body {
  max-height: 600rpx;
}

.input-group {
  margin-bottom: 24rpx;
}

.input-label {
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
  color: v-bind('theme.textPrimary');
}

.input-placeholder {
  color: v-bind('theme.textMuted');
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
  color: #fff;
}
</style>
