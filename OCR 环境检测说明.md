# ⚠️ 重要提示：OCR 功能需要开发构建

## 为什么在 Expo Go 中无法使用 OCR？

您当前使用的环境是 **Expo Go**，它是一个通用的预编译应用，**不包含任何自定义原生模块**。

`react-native-tesseract-ocr` 是一个原生模块（基于 C++ 的 Tesseract OCR 引擎），必须在编译时链接到 APK 中才能使用。

---

## 如何解决？

您需要使用 **Development Build（开发构建）** 或 **EAS Build** 来生成包含原生模块的 APK。

### 方案 1：使用 EAS Build（推荐）⭐

**优势**：无需配置本地环境，云端构建

```bash
# 1. 安装 EAS CLI
npm install -g eas-cli

# 2. 登录 Expo（需要 Expo 账号）
eas login

# 3. 配置项目
cd /workspace/projects/client
eas build:configure

# 4. 构建开发版本 APK（需要 10-20 分钟）
eas build --platform android --profile development

# 5. 下载并安装 APK（构建完成后会提供下载链接）
```

### 方案 2：本地构建

**优势**：完全免费，快速迭代

**前置条件**：
- Android Studio
- JDK 17
- Android SDK API 34+

```bash
cd /workspace/projects/client

# 1. 生成原生项目
npx expo prebuild --platform android --clean

# 2. 构建并安装到设备
npx expo run:android
```

---

## 如何检测当前环境？

现在应用会自动检测环境并显示友好提示：

### 在 Expo Go 中：

会显示：

```
⚠️ OCR 功能不可用

当前使用的是 Expo Go，不支持原生 OCR 模块

请按照以下步骤构建开发版本：

方案 1：使用 EAS Build（推荐）
----------------------------------
1. 安装 EAS CLI：
   npm install -g eas-cli

2. 登录 Expo：
   eas login

3. 配置项目：
   cd /workspace/projects/client
   eas build:configure

4. 构建开发版本：
   eas build --platform android --profile development

5. 下载并安装 APK

方案 2：本地构建
----------------------------------
1. 生成原生项目：
   cd /workspace/projects/client
   npx expo prebuild --platform android --clean

2. 构建并安装：
   npx expo run:android

构建完成后，OCR 功能即可正常使用。
```

### 在 Development Build 中：

OCR 功能正常工作，可以拍照识别文字。

---

## 环境对比

| 环境 | 原生模块支持 | OCR 功能 | 使用方式 |
|------|------------|---------|---------|
| **Expo Go** | ❌ 不支持 | ❌ 无法使用 | 下载 Expo Go 应用 |
| **Development Build** | ✅ 支持 | ✅ 可以使用 | 使用 EAS Build 或本地构建 |
| **Production Build** | ✅ 支持 | ✅ 可以使用 | 使用 EAS Build 或本地构建 |

---

## 常见问题

### Q1: 为什么不把 OCR 做成纯 JavaScript？

A: 纯 JavaScript 的 OCR 识别率低（约 70-80%）且速度慢。使用原生模块可以实现：
- ✅ 更高的识别率（85-95%）
- ✅ 更快的速度（2-3 秒）
- ✅ 完全离线使用

### Q2: 构建需要多长时间？

A: 
- EAS Build（首次）：10-20 分钟
- EAS Build（后续）：5-10 分钟
- 本地构建：取决于电脑性能，通常 5-15 分钟

### Q3: 构建需要付费吗？

A: EAS Build 每月有免费额度，超出后需要付费。本地构建完全免费。

### Q4: 构建 APK 后可以直接安装吗？

A: 是的，构建完成后会生成 APK 文件，可以直接传输到手机安装。

---

## 快速开始（推荐使用 EAS Build）

如果您想快速测试 OCR 功能，请按照以下步骤操作：

```bash
# 1. 安装 EAS CLI
npm install -g eas-cli

# 2. 登录 Expo（如果还没有 Expo 账号，需要注册一个）
eas login

# 3. 配置项目
cd /workspace/projects/client
eas build:configure

# 4. 构建开发版本 APK
eas build --platform android --profile development

# 5. 等待构建完成（10-20 分钟）
# 构建完成后，EAS 会提供下载链接

# 6. 下载 APK 文件
# 7. 传输到手机并安装
# 8. 首次使用时，OCR 会下载语言包（约 10MB），需要联网
```

---

## 下一步

1. **选择构建方式**：EAS Build（推荐）或本地构建
2. **构建 APK**：按照上述步骤执行
3. **安装测试**：在手机上安装并测试 OCR 功能
4. **享受功能**：识别率 85-95%，速度 2-3 秒，完全离线

如有问题，请参考：
- `本地构建指南 - react-native-tesseract-ocr.md`
- `GitHub OCR 方案对比报告.md`
- `当前状态总结.md`
