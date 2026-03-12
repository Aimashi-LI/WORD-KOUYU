# Android Studio 打包 APK 完整指南

## 问题说明

使用 Android Studio 打包 Expo 项目时遇到的 Maven 仓库配置问题：

- **Gradle 版本不匹配**：已修复为 8.13
- **Maven 仓库配置不完整**：找不到 Expo 模块依赖
  - expo.modules.image:3.0.11
  - expo.modules.imageloader:6.0.0
  - expo.modules.imagemanipulator:14.0.8
  - expo.modules.imagepicker:17.0.10
  - expo.modules.keepawake:15.0.8
  - expo.modules.lineargradient:15.0.8
  - expo.modules.linking:8.0.11
  - expo.modules.location:19.0.8
  - expo.modules.sharing:14.0.8

## 解决方案

### 方案一：使用 EAS Build（推荐）⭐

Expo 官方推荐的云端构建方案，无需配置本地环境。

#### 步骤：

1. **安装 EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **登录 Expo 账户**
   ```bash
   eas login
   ```

3. **配置 EAS 项目**
   ```bash
   cd client
   eas build:configure
   ```

4. **构建 APK**
   ```bash
   eas build -p android --profile preview
   ```

#### 优势：
- ✅ 自动配置所有依赖
- ✅ 云端构建，无需配置本地环境
- ✅ 支持签名管理
- ✅ 构建速度快，稳定可靠

---

### 方案二：使用修复脚本（半自动）

使用提供的修复脚本自动配置 Gradle 仓库。

#### 步骤：

1. **进入 client 目录**
   ```bash
   cd /workspace/projects/client
   ```

2. **运行修复脚本**
   ```bash
   ./fix-gradle-repos.sh
   ```

3. **在 Android Studio 中同步项目**
   - 打开 `android` 目录
   - 点击 `File → Sync Project with Gradle Files`

4. **构建 APK**
   - 点击 `Build → Build Bundle(s) / APK(s) → Build APK(s)`

---

### 方案三：手动修复

如果脚本不适用，可以手动修改配置文件。

#### 步骤 1：生成 Android 项目

```bash
cd /workspace/projects/client
npx expo prebuild --clean
```

#### 步骤 2：修复 `android/settings.gradle`

在 `dependencyResolutionManagement.repositories` 中添加：

```gradle
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()

        // ✅ 关键配置：本地 node_modules Maven 仓库
        def nodeModulesPath = new File(["node", "--print", "require.resolve('expo/package.json')"].execute(null, rootDir).text.trim(), "..")
        maven {
            url new File(nodeModulesPath, "expo/android/maven")
        }
        maven {
            url new File(nodeModulesPath, "react-native/android")
        }

        // ❌ 移除或注释掉阿里云镜像（可能导致冲突）
        // maven { url 'https://maven.aliyun.com/repository/public' }
    }
}
```

#### 步骤 3：修复 `android/build.gradle`

在 `allprojects.repositories` 中添加：

```gradle
allprojects {
    repositories {
        google()
        mavenCentral()

        // ✅ 添加本地 node_modules 仓库
        maven { url "$rootDir/../node_modules/react-native/android" }
        maven { url "$rootDir/../node_modules/expo/android/maven" }
    }
}
```

#### 步骤 4：同步 Gradle

在 Android Studio 中：
1. 点击 `File → Sync Project with Gradle Files`
2. 等待同步完成

#### 步骤 5：构建 APK

点击 `Build → Build Bundle(s) / APK(s) → Build APK(s)`

---

## 常见问题

### Q1: 为什么阿里云镜像不能使用？

**A**: 阿里云镜像主要包含 Java/Android 官方依赖，不包含 Expo 的 npm 模块。Expo 模块是通过 npm 安装的，需要从本地的 `node_modules` 目录加载。

### Q2: Gradle 同步仍然失败？

**A**: 尝试以下步骤：

1. 清理 Gradle 缓存：
   ```bash
   cd android
   ./gradlew clean
   rm -rf ~/.gradle/caches/
   ```

2. 重新同步项目

3. 检查网络连接（确保能访问 Maven Central）

### Q3: 如何验证 Maven 仓库配置是否正确？

**A**: 在 Android Studio 的 Terminal 中执行：

```bash
cd android
./gradlew dependencies --configuration implementation
```

查看是否有 Expo 相关的依赖项。

### Q4: 构建成功后 APK 在哪里？

**A**:
- Android Studio: `android/app/build/outputs/apk/debug/`
- EAS Build: 构建完成后会提供下载链接

---

## 推荐方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **EAS Build** | 简单、稳定、自动配置 | 需要网络、依赖云端 | ⭐⭐⭐⭐⭐ |
| **修复脚本** | 半自动、本地控制 | 需要手动同步 Gradle | ⭐⭐⭐⭐ |
| **手动修复** | 完全可控 | 配置复杂、容易出错 | ⭐⭐⭐ |

---

## 总结

**强烈推荐使用 EAS Build**，这是 Expo 官方推荐的构建方案，能够避免所有本地配置问题。

如果必须使用 Android Studio 打包，请使用提供的 `fix-gradle-repos.sh` 脚本自动修复配置。

---

## 相关文档

- [Expo Prebuild 文档](https://docs.expo.dev/workflow/prebuild/)
- [EAS Build 文档](https://docs.expo.dev/build/introduction/)
- [Android Studio 构建 APK 指南](https://developer.android.com/studio/build/building-cmdline)
