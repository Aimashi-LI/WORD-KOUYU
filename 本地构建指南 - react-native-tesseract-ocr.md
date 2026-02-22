# 本地构建指南 - react-native-tesseract-ocr

## 为什么需要开发构建？

`react-native-tesseract-ocr` 是原生模块，需要包含在 APK 中才能运行。**Expo Go 不包含任何自定义原生模块**，因此无法使用。

## 方案对比

### 方案 1：EAS Build（推荐，云端构建）
**优点**：
- ✅ 无需配置本地环境（无需 Android Studio）
- ✅ 使用 Expo 云端构建服务器
- ✅ 自动处理签名和依赖
- ✅ 生成可直接安装的 APK

**缺点**：
- ⏱️ 首次构建需要 10-20 分钟
- 💰 每月有免费额度（超限需付费）

### 方案 2：本地构建
**优点**：
- ✅ 完全免费
- ✅ 可以快速迭代（修改后立即构建）
- ✅ 可以调试原生代码

**缺点**：
- ⚙️ 需要配置 Android Studio
- ⚙️ 需要配置 JDK、Android SDK
- ⚙️ 首次配置较复杂

---

## 方案 1：EAS Build（推荐）

### 步骤 1：安装 EAS CLI

```bash
npm install -g eas-cli
```

### 步骤 2：配置 EAS Build

```bash
cd /workspace/projects/client

# 首次使用需要登录 Expo 账号
eas login

# 配置项目
eas build:configure
```

### 步骤 3：构建开发版本 APK

```bash
# 构建开发版本（包含所有依赖，可以调试）
eas build --platform android --profile development
```

**预计时间**：
- 首次构建：10-20 分钟
- 后续构建：5-10 分钟

### 步骤 4：下载并安装 APK

构建完成后：
1. 访问 EAS 构建页面（会显示链接）
2. 下载 APK 文件
3. 传输到手机并安装

或者使用命令：
```bash
eas build:list
# 复制构建 ID，然后
eas build:view [构建ID]
```

### 步骤 5：验证 OCR 功能

安装后，在应用中：
1. 打开相机扫描页面
2. 拍摄包含英文文本的图片
3. 等待识别结果（首次使用会下载语言包，约 10MB）

---

## 方案 2：本地构建（高级用户）

### 前置条件

1. **安装 Android Studio**
   - 下载：https://developer.android.com/studio
   - 安装 Android SDK（API 34+）

2. **安装 JDK 17**
   - 下载：https://adoptium.net/
   - 设置环境变量：`JAVA_HOME`

3. **配置 Android SDK 路径**

```bash
# Windows (PowerShell)
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\你的用户名\AppData\Local\Android\Sdk', 'User')

# 验证
echo $env:ANDROID_HOME
```

### 步骤 1：生成原生项目

```bash
cd /workspace/projects/client

# 清理并重新生成 Android 项目
npx expo prebuild --platform android --clean
```

### 步骤 2：配置 Android SDK 路径

编辑 `android/local.properties`：

```properties
sdk.dir=C:\\Users\\你的用户名\\AppData\\Local\\Android\\Sdk
```

### 步骤 3：构建并安装到设备

```bash
# 确保 Android 设备已连接（USB 调试已开启）

# 方式 1：使用 Expo CLI（推荐）
npx expo run:android

# 方式 2：使用 Gradle
cd android
./gradlew assembleDebug
./gradlew installDebug
```

### 步骤 4：验证

在 Android Studio 或手机上打开应用，测试 OCR 功能。

---

## 常见问题

### Q1: EAS Build 失败，提示缺少依赖

**解决方案**：检查 `app.json` 或 `app.config.js` 中的依赖配置

```json
{
  "expo": {
    "plugins": []
  }
}
```

### Q2: 本地构建失败，提示找不到 Android SDK

**解决方案**：
1. 确认 `local.properties` 文件存在
2. 确认路径正确（使用双反斜杠 `\\`）
3. 确认已安装 Android SDK API 34+

### Q3: 识别速度慢

**解决方案**：
1. 首次使用需要下载语言包（约 10MB），请耐心等待
2. 后续识别会使用缓存，速度会快很多（2-3 秒）
3. 可以切换到 BASE 模式（快速模式）

### Q4: 识别率不高

**解决方案**：
1. 拍摄清晰的图片
2. 确保光线充足
3. 文字居中，避免倾斜
4. 使用 BEST 模式（高精度模式）

### Q5: EAS Build 构建排队中

**解决方案**：
- EAS Build 使用排队系统，高峰期可能需要等待
- 可以升级到 EAS Build 付费计划获得更高优先级

---

## 识别精度对比

| 模式 | 速度 | 识别率 | 适用场景 |
|-----|------|-------|---------|
| **BASE** | 2-3 秒 | 80-85% | 快速预览、实时识别 |
| **BEST** | 5-8 秒 | 90-95% | 重要文档、精确识别 |

**如何切换模式**：

编辑 `client/utils/ocr.ts`：

```typescript
const text = await RnTesseractOcr.recognize(imageUri, 'ENG', {
  level: 'BASE', // 改为 'BEST' 使用高精度模式
});
```

---

## 下一步

### 如果您选择 EAS Build（推荐）

1. 执行：`cd /workspace/projects/client && eas build:configure`
2. 执行：`eas build --platform android --profile development`
3. 等待 10-20 分钟
4. 下载并安装 APK

### 如果您选择本地构建

1. 安装 Android Studio 和 JDK 17
2. 配置环境变量
3. 执行：`cd /workspace/projects/client && npx expo prebuild --platform android --clean`
4. 执行：`npx expo run:android`

---

## 技术支持

- [EAS Build 官方文档](https://docs.expo.dev/build/introduction/)
- [react-native-tesseract-ocr GitHub](https://github.com/jonathanpalma/react-native-tesseract-ocr)
- [Expo 原生模块配置](https://docs.expo.dev/workflow/customizing/)
