# 本地原生构建快速参考

## 🎯 核心步骤（10 分钟内）

### 1️⃣ 环境检查
```bash
java -version  # 检查 JDK 17+
node -v        # 检查 Node.js 18+
```

### 2️⃣ 安装依赖
```bash
cd client
pnpm install
```

### 3️⃣ 生成 Android 项目
```bash
npx expo prebuild --platform android --clean
```

### 4️⃣ 打开 Android Studio
```
File > Open > 选择 android 目录
```

### 5️⃣ 连接手机
- 启用 USB 调试
- 连接 USB 线
- 授权调试

### 6️⃣ 运行应用
- 点击 Android Studio 的绿色播放按钮
- 等待编译和安装

---

## 📱 验证成功

应用安装后，测试本地 OCR：

1. 打开应用
2. 进入相机扫描
3. 拍照识别单词
4. ✅ 成功识别，完全离线

---

## ⚡ 快速重新构建

修改代码后：
```bash
cd android
./gradlew installDebug
```

---

## 📂 构建产物位置

Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`

Release APK: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🆘 常见问题快速解决

| 问题 | 解决方案 |
|------|---------|
| Gradle 同步失败 | 检查网络，关闭 VPN |
| 设备未连接 | 启用 USB 调试，更换 USB 线 |
| ML Kit 未加载 | 使用原生构建，不是 Expo Go |

---

**详细指南**：请查看 `ANDROID_BUILD_GUIDE.md`
