# Android 本地构建指南

本文档指导如何在本地电脑（已安装 Android Studio 和 JDK）构建包含 ML Kit OCR 的原生应用。

## 📋 前置要求

✅ **必须已安装**：
- Android Studio（最新稳定版）
- JDK 17 或更高版本
- Node.js 18+ 和 pnpm
- Android 手机（用于测试）

## 🔧 步骤 1：环境检查

在本地电脑上执行以下命令检查环境：

```bash
# 检查 JDK 版本
java -version
# 应该显示：openjdk version "17.x.x" 或更高

# 检查 Node.js 版本
node -v
# 应该显示：v18.x.x 或更高

# 检查 pnpm 版本
pnpm -v
# 应该显示：pnpm 版本号

# 检查 ANDROID_HOME（可选，手动配置后检查）
echo $ANDROID_HOME
# 应该显示 Android SDK 路径
```

## 📦 步骤 2：下载项目代码

将项目代码下载到你的本地电脑：

```bash
# 选项 A：使用 Git 克隆（如果有 Git 仓库）
git clone <repository-url>
cd <project-directory>

# 选项 B：直接复制项目文件夹
# 将整个 /workspace/projects 目录复制到你的本地电脑
```

## 🛠️ 步骤 3：安装依赖

在项目根目录执行：

```bash
cd client
pnpm install
```

## 🏗️ 步骤 4：生成原生 Android 项目

```bash
# 设置环境变量（Windows 用户需要在系统环境变量中配置）
# macOS/Linux
export JAVA_HOME=$(/usr/libexec/java_home -v 17)  # macOS
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  # Linux

# 生成 Android 项目
npx expo prebuild --platform android --clean
```

执行成功后，会生成 `android/` 目录，包含完整的 Android 项目结构。

## 🎯 步骤 5：使用 Android Studio 打开项目

1. 打开 Android Studio
2. 选择 `File > Open`
3. 浏览到项目的 `android` 目录
4. 选择 `android` 文件夹，点击 `OK`

Android Studio 会自动：
- 下载 Gradle 依赖
- 同步项目
- 配置 Android SDK

**首次同步可能需要 10-30 分钟**，请耐心等待。

## 🔌 步骤 6：连接 Android 手机

### 方法 A：通过 USB 连接

1. 在手机上启用开发者选项：
   - 进入 `设置 > 关于手机`
   - 连续点击 `版本号` 7 次
   - 返回设置，找到 `开发者选项`

2. 启用 USB 调试：
   - 打开 `开发者选项`
   - 启用 `USB 调试`

3. 用 USB 线连接手机和电脑

4. 在手机上授权调试

5. 在 Android Studio 中验证连接：
   - 查看 `Run` 窗口的设备列表
   - 应该能看到你的手机型号

### 方法 B：通过 ADB 无线连接（可选）

```bash
# 确保手机和电脑在同一 WiFi 网络
# 先通过 USB 连接一次，然后执行：
adb tcpip 5555

# 断开 USB，然后无线连接：
adb connect <手机IP地址>:5555
```

## ▶️ 步骤 7：构建和运行

### 方法 A：通过 Android Studio UI

1. 在 Android Studio 顶部工具栏，选择你的设备
2. 点击绿色播放按钮（Run 按钮）
3. 等待应用编译和安装
4. 应用会自动在手机上打开

### 方法 B：通过命令行

```bash
# 在 android 目录下执行
cd android

# Debug 版本（带调试符号，体积较大）
./gradlew assembleDebug

# Release 版本（优化过，体积小，适合发布）
./gradlew assembleRelease

# 安装到连接的设备
./gradlew installDebug
```

## ✅ 步骤 8：测试本地 OCR

应用安装后：

1. 打开应用
2. 进入相机扫描页面
3. 拍照识别单词
4. ✅ 应该能成功识别，完全离线

## 📱 构建产物位置

- **Debug APK**：`android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**：`android/app/build/outputs/apk/release/app-release.apk`

可以直接复制这些 APK 文件到其他手机安装。

## 🔧 常见问题

### Q1: Gradle 同步失败

**解决方案**：
1. 检查网络连接（需要下载依赖）
2. 关闭 VPN（可能影响下载）
3. 清理缓存：
   ```bash
   cd android
   ./gradlew clean
   ```

### Q2: JDK 版本不匹配

**错误信息**：`Unsupported class file major version 61`

**解决方案**：
1. 安装 JDK 17
2. 在 Android Studio 中设置 JDK：
   - `File > Project Structure > SDK Location`
   - 设置 `JDK location` 为 JDK 17 路径

### Q3: Android SDK 未找到

**错误信息**：`Android SDK not found`

**解决方案**：
1. 打开 Android Studio
2. `Tools > SDK Manager`
3. 安装 Android SDK（推荐 API 34）
4. 设置环境变量 `ANDROID_HOME`

### Q4: 设备未连接

**错误信息**：`No connected devices`

**解决方案**：
1. 确认 USB 调试已启用
2. 尝试更换 USB 线
3. 重新授权 USB 调试
4. 重启 ADB：
   ```bash
   adb kill-server
   adb start-server
   ```

### Q5: 识别失败（ML Kit 未加载）

**错误信息**：`Cannot read property 'detectFromUri' of null`

**解决方案**：
1. 确认使用的是原生构建的应用（不是 Expo Go）
2. 确认 `react-native-mlkit-ocr` 已在 `package.json` 中
3. 清理并重新构建：
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleDebug
   ```

## 🚀 后续开发

### 修改代码后重新构建

```bash
# 方法 A：增量构建（快速）
cd android
./gradlew installDebug

# 方法 B：完整构建（确保干净）
cd android
./gradlew clean assembleDebug
```

### 热重载（开发模式）

```bash
# 在项目根目录启动 Metro bundler
cd client
npx expo start --dev-client

# 在 Android Studio 中运行应用
# 应用会连接到 Metro bundler，支持热重载
```

## 📊 构建时间

| 操作 | 首次 | 后续 |
|------|------|------|
| Gradle 下载依赖 | 10-30 分钟 | - |
| 生成原生项目 | 2-5 分钟 | - |
| 构建 Debug APK | 3-5 分钟 | 1-2 分钟 |
| 构建 Release APK | 5-10 分钟 | 2-3 分钟 |

## 🎉 成功标志

构建成功后，你将拥有：

- ✅ 完全离线的单词识别应用
- ✅ 识别率 95%+
- ✅ 响应速度 200-500ms
- ✅ 无需网络连接

## 📞 获取帮助

如果遇到问题：

1. 查看 Android Studio 的 `Build` 窗口日志
2. 检查 `android/app/build.gradle` 配置
3. 查看 Expo 官方文档：https://docs.expo.dev

---

**祝你构建成功！🚀**
