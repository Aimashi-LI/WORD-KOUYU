# Tesseract.js OCR 实现说明

## 方案概述

已将 OCR 方案从 **Google ML Kit** 迁移到 **Tesseract.js**，实现完全纯前端的离线 OCR 功能。

### 为什么选择 Tesseract.js？

1. **纯前端方案**：无需配置原生模块，无需 Android Studio，无需 Gradle 构建
2. **完全离线**：首次下载语言包（约 10MB）后，可完全离线使用
3. **跨平台兼容**：支持 Android、iOS、Web 三端
4. **简单部署**：`expo build` 或 `eas build` 即可生成 APK，无需额外配置

## 技术实现

### 核心文件

```
client/utils/
├── ocr.ts              # Tesseract.js 实现主文件
└── ocr-common.ts       # OCR 通用工具函数
```

### 关键代码逻辑

```typescript
// 1. 创建 Tesseract Worker
const worker = await Tesseract.createWorker('eng', 1, {
  logger: (m) => console.log(`识别进度: ${Math.round(m.progress * 100)}%`)
});

// 2. 执行识别
const result = await worker.recognize(imageUri);

// 3. 提取文本
const text = result.data.text?.trim() || '';

// 4. 按行分割
const lines = text.split('\n').filter(line => line.trim().length > 0);

// 5. 提取英文单词
const words = extractValidWords({ success: true, text, lines });
```

### 首次使用流程

1. **首次识别时**：
   - 自动下载英文语言包（约 10MB）
   - 缓存到设备本地
   - 识别速度较慢（约 5-10 秒）

2. **后续使用**：
   - 直接使用本地缓存的语言包
   - 识别速度较快（约 2-3 秒）
   - 完全离线，无需网络

## 使用方式

### 在组件中使用

```typescript
import { recognizeText, cleanup } from '@/utils/ocr';

// 组件挂载时初始化
useEffect(() => {
  return () => {
    // 组件卸载时清理 Worker
    cleanup();
  };
}, []);

// 识别文本
const handleRecognize = async (imageUri: string) => {
  const result = await recognizeText(imageUri);

  if (result.success) {
    console.log('识别到的文本:', result.text);
    console.log('识别到的单词:', result.words);
  } else {
    console.error('识别失败:', result.error);
  }
};
```

## 性能优化

### Worker 复用

```typescript
// 使用全局缓存，避免重复创建 Worker
let tesseractWorker: any = null;

async function getWorker() {
  if (tesseractWorker) {
    return tesseractWorker;
  }
  const worker = await Tesseract.createWorker('eng');
  tesseractWorker = worker;
  return worker;
}
```

### 资源清理

```typescript
// 组件卸载时清理 Worker
useEffect(() => {
  return () => {
    cleanup();
  };
}, []);
```

## 错误处理

### 常见错误及解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| 首次使用需要下载语言包 | 首次运行需要联网 | 检查网络连接，耐心等待下载 |
| 未识别到文本 | 图片质量差或无文本 | 重新拍摄清晰的图片 |
| OCR 识别失败 | Worker 异常 | 调用 `cleanup()` 清理后重试 |

### 错误提示优化

```typescript
if (error.message?.includes('network')) {
  errorMessage = '首次使用需要下载语言包（约 10MB），请检查网络连接';
} else if (!text || text.length === 0) {
  errorMessage = '未识别到文本，请重新拍摄';
}
```

## 构建和部署

### 前置条件

- Node.js 18+
- pnpm
- Expo 账号（用于 EAS Build）

### 构建步骤

#### 1. 安装依赖

```bash
cd client
pnpm install
```

#### 2. 配置 EAS Build

```bash
npx eas build:configure
```

#### 3. 构建 Android APK

```bash
# 开发版本（推荐）
npx eas build --platform android --profile development

# 生产版本
npx eas build --platform android --profile preview
```

#### 4. 安装 APK

```bash
# 从 EAS 网站下载 APK
# 或使用 eas install
npx eas install --platform android
```

### 本地测试（可选）

如果需要在本地设备上测试：

```bash
# 启动开发服务器
npx expo start

# 扫描二维码安装 Expo Go
# 在 Expo Go 中打开项目
```

## 与 ML Kit 方案对比

| 特性 | Tesseract.js | ML Kit |
|-----|-------------|--------|
| **实现方式** | 纯前端 JS/TS | 原生模块 + Gradle |
| **部署难度** | 简单（expo build） | 复杂（Android Studio + Gradle） |
| **首次使用** | 需下载语言包（10MB） | 需下载模型（20MB） |
| **识别速度** | 2-10 秒 | 1-3 秒 |
| **识别率** | 85-90% | 95%+ |
| **离线支持** | ✅ 完全离线 | ✅ 完全离线 |
| **跨平台** | ✅ Android/iOS/Web | ❌ 仅 Android/iOS |
| **维护成本** | 低 | 高 |

## 优势总结

✅ **简单快捷**：无需配置原生环境，一行命令构建 APK

✅ **完全离线**：首次下载后可离线使用

✅ **跨平台兼容**：一套代码，三端运行

✅ **降低门槛**：适合个人开发者和小团队

✅ **易于维护**：无需处理 Gradle 配置、NDK 版本等问题

## 注意事项

⚠️ **首次使用需要联网**：首次运行会下载英文语言包（约 10MB），请确保设备已连接网络

⚠️ **识别率略低于 ML Kit**：对于高质量文本图片，识别率约为 85-90%，建议用户拍摄清晰的图片

⚠️ **识别速度较慢**：首次识别较慢（5-10 秒），后续使用缓存会加速（2-3 秒）

⚠️ **内存占用**：Worker 会占用一定内存，建议在组件卸载时调用 `cleanup()`

## 未来优化方向

1. **性能优化**：
   - 使用 Web Worker 提升识别速度
   - 优化图片预处理（缩放、二值化）

2. **功能增强**：
   - 支持多语言识别（中文、日文等）
   - 支持表格识别
   - 支持手写识别

3. **用户体验**：
   - 添加识别进度动画
   - 添加识别结果编辑功能
   - 添加历史记录

## 参考文档

- [Tesseract.js 官方文档](https://tesseract.projectnaptha.com/)
- [Expo Build 官方文档](https://docs.expo.dev/build/introduction/)
- [React Native 图像处理](https://docs.expo.dev/versions/latest/sdk/image/)
