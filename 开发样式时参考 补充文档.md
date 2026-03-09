# uni-app 迁移文档 - 样式系统补充说明

## 发现的问题

### 1. 样式系统描述不完整
- **问题**：主文档没有详细说明主题系统的完整实现
- **影响**：迁移时可能无法正确复制主题系统
- **修正**：补充完整的样式系统定义和迁移指南

### 2. 颜色值不准确
- **问题**：文档中只提到"浅蓝色"、"浅红色"等描述，没有提供实际的 hex 值
- **实际值**：
  - 模式一容器背景：`#3B82F608`（8% 透明度的蓝色）
  - 模式二容器背景：`#EF444408`（8% 透明度的红色）
  - 模式一输入框背景：`#3B82F615`（15% 透明度的蓝色）
  - 模式二输入框背景：`#EF444415`（15% 透明度的红色）
  - 模式一卡片背景：`#3B82F610`（10% 透明度的蓝色）
  - 模式二卡片背景：`#EF444410`（10% 透明度的红色）

### 3. 主题系统定义缺失
- **问题**：文档没有提供 Colors、Spacing、BorderRadius、Typography 的完整定义
- **影响**：无法准确还原原始应用的视觉设计

---

## 样式系统完整定义

### A. 颜色系统（Colors）

#### 亮色主题（Light Theme）
```typescript
const Colors = {
  light: {
    // 文字颜色 - Stone 色系
    textPrimary: "#44403C",      // Stone-700 - 主要文字
    textSecondary: "#78716C",    // Stone-500 - 次要文字
    textMuted: "#A8A29E",        // Stone-400 - 辅助文字

    // 主题色 - Amber 色系（温暖护眼）
    primary: "#B45309",          // Amber-600 - 主色调
    accent: "#D97706",           // Amber-500 - 辅助强调色

    // 状态颜色
    success: "#10B981",          // Emerald-500 - 成功
    error: "#EF4444",            // Red-500 - 错误
    warning: "#F59E0B",          // Amber-500 - 警告

    // 背景色 - Stone 色系
    backgroundRoot: "#F5F5F4",   // Stone-100 - 根背景（护眼）
    backgroundDefault: "#FAFAF9",// Stone-50 - 卡片背景
    backgroundTertiary: "#E7E5E4",// Stone-200 - 输入框背景

    // 按钮文字
    buttonPrimaryText: "#FFFFFF",
    tabIconSelected: "#B45309",

    // 边框颜色
    border: "#D6D3D1",           // Stone-300
    borderLight: "#E7E5E4",      // Stone-200
  }
}
```

#### 暗色主题（Dark Theme）
```typescript
const Colors = {
  dark: {
    // 文字颜色 - Stone 色系（反转）
    textPrimary: "#FAFAF9",      // Stone-50 - 主要文字
    textSecondary: "#A8A29E",    // Stone-400 - 次要文字
    textMuted: "#78716C",        // Stone-500 - 辅助文字

    // 主题色 - Amber 色系（略亮）
    primary: "#D97706",          // Amber-500 - 主色调
    accent: "#F59E0B",           // Amber-400 - 辅助强调色

    // 状态颜色
    success: "#34D399",          // Emerald-400 - 成功
    error: "#F87171",            // Red-400 - 错误
    warning: "#FBBF24",          // Amber-400 - 警告

    // 背景色 - Stone 色系（深色）
    backgroundRoot: "#1C1917",   // Stone-900 - 根背景
    backgroundDefault: "#292524",// Stone-800 - 卡片背景
    backgroundTertiary: "#44403C",// Stone-700 - 输入框背景

    // 按钮文字
    buttonPrimaryText: "#1C1917",
    tabIconSelected: "#D97706",

    // 边框颜色
    border: "#44403C",           // Stone-700
    borderLight: "#292524",      // Stone-800
  }
}
```

### B. 间距系统（Spacing）
```typescript
const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
};
```

### C. 圆角系统（BorderRadius）
```typescript
const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  full: 9999,
};
```

### D. 字体系统（Typography）
```typescript
const Typography = {
  display: { fontSize: 112, lineHeight: 112, fontWeight: "200", letterSpacing: -4 },
  displayLarge: { fontSize: 112, lineHeight: 112, fontWeight: "200", letterSpacing: -2 },
  displayMedium: { fontSize: 48, lineHeight: 56, fontWeight: "200" },
  h1: { fontSize: 32, lineHeight: 40, fontWeight: "700" },
  h2: { fontSize: 28, lineHeight: 36, fontWeight: "700" },
  h3: { fontSize: 24, lineHeight: 32, fontWeight: "300" },
  h4: { fontSize: 20, lineHeight: 28, fontWeight: "600" },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
  small: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  smallMedium: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
  captionMedium: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 2, textTransform: "uppercase" },
  labelSmall: { fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 1, textTransform: "uppercase" },
  labelTitle: { fontSize: 14, lineHeight: 20, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  link: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  stat: { fontSize: 30, lineHeight: 36, fontWeight: "300" },
  tiny: { fontSize: 10, lineHeight: 14, fontWeight: "400" },
  navLabel: { fontSize: 10, lineHeight: 14, fontWeight: "500" },
};
```

---

## uni-app 样式迁移指南

### 1. StyleSheet → CSS/SCSS

**React Native StyleSheet**：
```typescript
import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: Spacing.lg,
      backgroundColor: theme.backgroundRoot,
      borderRadius: BorderRadius.lg,
    },
    title: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '700',
      color: theme.textPrimary,
      marginBottom: Spacing.md,
    },
  });
};
```

**uni-app SCSS**：
```scss
// 使用 CSS 变量实现主题切换
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 12px;
$spacing-lg: 16px;
$spacing-xl: 20px;
$spacing-2xl: 24px;
$spacing-3xl: 32px;

$border-radius-xs: 4px;
$border-radius-sm: 8px;
$border-radius-md: 12px;
$border-radius-lg: 16px;
$border-radius-xl: 20px;
$border-radius-2xl: 24px;

// 亮色主题变量（默认）
:root {
  --text-primary: #44403C;
  --text-secondary: #78716C;
  --text-muted: #A8A29E;
  --primary: #B45309;
  --accent: #D97706;
  --success: #10B981;
  --error: #EF4444;
  --warning: #F59E0B;
  --background-root: #F5F5F4;
  --background-default: #FAFAF9;
  --background-tertiary: #E7E5E4;
  --button-primary-text: #FFFFFF;
  --border: #D6D3D1;
  --border-light: #E7E5E4;
}

// 暗色主题变量
[data-theme="dark"] {
  --text-primary: #FAFAF9;
  --text-secondary: #A8A29E;
  --text-muted: #78716C;
  --primary: #D97706;
  --accent: #F59E0B;
  --success: #34D399;
  --error: #F87171;
  --warning: #FBBF24;
  --background-root: #1C1917;
  --background-default: #292524;
  --background-tertiary: #44403C;
  --button-primary-text: #1C1917;
  --border: #44403C;
  --border-light: #292524;
}

.container {
  flex: 1;
  padding: $spacing-lg;
  background-color: var(--background-root);
  border-radius: $border-radius-lg;
}

.title {
  font-size: 28px;
  line-height: 36px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: $spacing-md;
}
```

### 2. 动态主题切换

**React Native（useTheme Hook）**：
```typescript
import { useTheme } from '@/hooks/useTheme';

export default function Component() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello</Text>
    </View>
  );
}
```

**uni-app（Pinia + CSS 变量）**：
```typescript
// stores/theme.ts
import { defineStore } from 'pinia';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    isDark: false,
  }),

  actions: {
    toggleTheme() {
      this.isDark = !this.isDark;
      // 切换 CSS 变量
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
      }
    },
  },
});

// 组件中使用
<script setup>
import { useThemeStore } from '@/stores/theme';

const { isDark, toggleTheme } = useThemeStore();
</script>

<template>
  <view class="container">
    <text class="title">Hello</text>
  </view>
</template>

<style scoped lang="scss">
.container {
  background-color: var(--background-root);
}

.title {
  color: var(--text-primary);
}
</style>
```

### 3. 阴影样式转换

**React Native 阴影**：
```typescript
card: {
  shadowColor: theme.primary,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
}
```

**uni-app 阴影（仅支持 App 和 H5，小程序不支持）**：
```scss
.card {
  box-shadow: 0 4px 8px 0 rgba(180, 83, 9, 0.1);
}

// 或者使用 CSS 变量
.card {
  box-shadow: 0 4px 8px 0 rgba($primary-rgb, 0.1);
}
```

**注意**：小程序不支持 box-shadow，需要使用图片或替代方案。

### 4. 特殊颜色转换

**复习详情页背景色**：

```scss
// 方式一容器背景
.review-mode-container-type1 {
  background-color: rgba(59, 130, 246, 0.03); // #3B82F608
  padding: $spacing-md;
  border-radius: $border-radius-lg;
}

// 方式二容器背景
.review-mode-container-type2 {
  background-color: rgba(239, 68, 68, 0.03); // #EF444408
  padding: $spacing-md;
  border-radius: $border-radius-lg;
}

// 方式一输入框背景
.input-type1 {
  background-color: rgba(59, 130, 246, 0.08); // #3B82F615
  border-color: rgba(59, 130, 246, 0.25); // #3B82F640
}

// 方式二输入框背景
.input-type2 {
  background-color: rgba(239, 68, 68, 0.08); // #EF444415
  border-color: rgba(239, 68, 68, 0.25); // #EF444440
}

// 正确状态
.card-correct {
  background-color: rgba(16, 185, 129, 0.13); // success 颜色 + 20% 透明度
  border-color: var(--success);
}

// 错误状态
.card-wrong {
  background-color: rgba(239, 68, 68, 0.13); // error 颜色 + 20% 透明度
  border-color: var(--error);
}

// 快速评分 - 粉色
.card-pink {
  background-color: rgba(255, 105, 180, 0.2); // #FF69B433
  border-color: #FF69B4;
}
```

### 5. 进度条样式

```scss
.progress-bar {
  height: 6px;
  background-color: var(--background-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}
```

### 6. Tab Bar 样式

**pages.json 配置**：
```json
{
  "tabBar": {
    "backgroundColor": "#F5F5F4",
    "borderStyle": "black",
    "selectedColor": "#B45309",
    "color": "#78716C",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "单词本",
        "iconPath": "static/icons/book.png",
        "selectedIconPath": "static/icons/book-active.png"
      }
    ]
  }
}
```

**暗色主题 Tab Bar**：
```typescript
// 在 App.vue 中动态切换
onLaunch() {
  const { isDark } = useThemeStore();
  if (isDark) {
    uni.setTabBarStyle({
      backgroundColor: '#1C1917',
      selectedColor: '#D97706',
      color: '#A8A29E'
    });
  }
}
```

---

## 样式迁移注意事项

### 1. 单位转换

| React Native | uni-app | 说明 |
|--------------|---------|------|
| 无单位（数字） | rpx / px | uni-app 建议使用 rpx（响应式像素） |
| 1 | 2rpx | 750rpx = 屏幕宽度 |

### 2. Flexbox 差异

```scss
// React Native
{
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
}

// uni-app（相同）
{
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}
```

### 3. 文本样式

```scss
// React Native
{
  fontSize: 16,
  lineHeight: 24,
  fontWeight: '700',
}

// uni-app
{
  font-size: 16px;  // 需要加 px 单位
  line-height: 24px;  // 需要加 px 单位
  font-weight: 700;
}
```

### 4. 平台差异

| 样式特性 | App | H5 | 小程序 | 说明 |
|---------|-----|-----|-------|------|
| box-shadow | ✅ | ✅ | ❌ | 小程序需用图片 |
| rgba 透明度 | ✅ | ✅ | ✅ | 完全支持 |
| flex | ✅ | ✅ | ✅ | 完全支持 |
| position: fixed | ✅ | ✅ | ⚠️ | 小程序需注意层级 |

### 5. 样式隔离

```scss
// 使用 scoped 避免样式污染
<style scoped lang="scss">
.container {
  background-color: var(--background-root);
}
</style>

// 或使用 CSS Modules
<style module lang="scss">
.container {
  background-color: var(--background-root);
}
</style>
```

---

## 完整主题文件示例

### uni.scss（全局主题变量）
```scss
// 间距系统
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 12px;
$spacing-lg: 16px;
$spacing-xl: 20px;
$spacing-2xl: 24px;
$spacing-3xl: 32px;
$spacing-4xl: 40px;
$spacing-5xl: 48px;
$spacing-6xl: 64px;

// 圆角系统
$border-radius-xs: 4px;
$border-radius-sm: 8px;
$border-radius-md: 12px;
$border-radius-lg: 16px;
$border-radius-xl: 20px;
$border-radius-2xl: 24px;
$border-radius-3xl: 28px;
$border-radius-4xl: 32px;
$border-radius-full: 9999px;

// 字体系统
$font-size-display: 112px;
$font-size-h1: 32px;
$font-size-h2: 28px;
$font-size-h3: 24px;
$font-size-h4: 20px;
$font-size-title: 18px;
$font-size-body: 16px;
$font-size-small: 14px;
$font-size-caption: 12px;
$font-size-tiny: 10px;

$line-height-display: 112px;
$line-height-h1: 40px;
$line-height-h2: 36px;
$line-height-h3: 32px;
$line-height-h4: 28px;
$line-height-title: 24px;
$line-height-body: 24px;
$line-height-small: 20px;
$line-height-caption: 16px;
$line-height-tiny: 14px;

// 亮色主题变量
:root {
  --text-primary: #44403C;
  --text-secondary: #78716C;
  --text-muted: #A8A29E;
  --primary: #B45309;
  --primary-light: rgba(180, 83, 9, 0.1);
  --accent: #D97706;
  --success: #10B981;
  --success-light: rgba(16, 185, 129, 0.1);
  --error: #EF4444;
  --error-light: rgba(239, 68, 68, 0.1);
  --warning: #F59E0B;
  --background-root: #F5F5F4;
  --background-default: #FAFAF9;
  --background-tertiary: #E7E5E4;
  --button-primary-text: #FFFFFF;
  --border: #D6D3D1;
  --border-light: #E7E5E4;

  // 特殊颜色
  --blue-light: rgba(59, 130, 246, 0.08);  // #3B82F615
  --blue-light-bg: rgba(59, 130, 246, 0.03); // #3B82F608
  --blue-border: rgba(59, 130, 246, 0.25); // #3B82F640
  --red-light: rgba(239, 68, 68, 0.08);   // #EF444415
  --red-light-bg: rgba(239, 68, 68, 0.03);  // #EF444408
  --red-border: rgba(239, 68, 68, 0.25);  // #EF444440
  --pink-light: rgba(255, 105, 180, 0.2);  // #FF69B433
}

// 暗色主题变量
[data-theme="dark"] {
  --text-primary: #FAFAF9;
  --text-secondary: #A8A29E;
  --text-muted: #78716C;
  --primary: #D97706;
  --primary-light: rgba(217, 119, 6, 0.1);
  --accent: #F59E0B;
  --success: #34D399;
  --success-light: rgba(52, 211, 153, 0.1);
  --error: #F87171;
  --error-light: rgba(248, 113, 113, 0.1);
  --warning: #FBBF24;
  --background-root: #1C1917;
  --background-default: #292524;
  --background-tertiary: #44403C;
  --button-primary-text: #1C1917;
  --border: #44403C;
  --border-light: #292524;
}

// 导出供 JS 使用
:export {
  spacing: $spacing-lg;
  borderRadius: $border-radius-lg;
}
```

### 使用示例
```scss
// pages/review-detail/index.scss
@import "@/uni.scss";

.review-mode-container-type1 {
  background-color: var(--blue-light-bg);
  padding: $spacing-md;
  border-radius: $border-radius-lg;
}

.input-type1 {
  background-color: var(--blue-light);
  border-color: var(--blue-border);
  padding: $spacing-md;
  border-radius: $border-radius-md;
}
```

---

## 总结

1. ✅ 添加了完整的颜色系统定义（亮色/暗色主题）
2. ✅ 添加了间距、圆角、字体系统的完整定义
3. ✅ 提供了 StyleSheet 到 SCSS 的转换示例
4. ✅ 说明了动态主题切换的实现方式
5. ✅ 提供了准确的背景色 hex 值
6. ✅ 说明了平台差异和注意事项
7. ✅ 提供了完整的主题变量文件示例

建议将此补充文档与主文档一起使用，确保样式系统的准确迁移。
