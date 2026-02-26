# Android Studio 打包完整教程（从零开始）

## 🎯 目标：将「编码记忆法」打包成 APK 并安装到手机

**总耗时**：约 70-120 分钟

---

## 📋 目录

1. [第一阶段：安装软件](#第一阶段安装软件)
2. [第二阶段：配置 Android Studio](#第二阶段配置-android-studio)
3. [第三阶段：配置环境变量](#第三阶段配置环境变量)
4. [第四阶段：获取项目](#第四阶段获取项目)
5. [第五阶段：安装依赖](#第五阶段安装依赖)
6. [第六阶段：生成原生代码](#第六阶段生成原生代码)
7. [第七阶段：打包 APK](#第七阶段打包-apk)
8. [第八阶段：安装到手机](#第八阶段安装到手机)

---

## 🖥️ 第一阶段：安装软件

### 步骤 1.1：安装 Node.js

#### 1.1.1 下载 Node.js

1. 打开浏览器，访问：https://nodejs.org/
2. 页面会自动显示你系统的版本（Windows）
3. 点击 **LTS** 版本的下载按钮（推荐 18.x 或 20.x）
   - LTS = Long Term Support（长期支持版本）
   - 图标显示 "18.x.x LTS" 或 "20.x.x LTS"

#### 1.1.2 安装 Node.js

1. 下载完成后，双击运行 `node-v18.x.x-x64.msi` 文件
2. 安装向导出现后：
   - 点击 **Next（下一步）**
   - 勾选 **"Accept the terms in the License Agreement"**（接受许可协议）
   - 点击 **Next**
3. 选择安装路径（默认即可）：
   - 默认路径：`C:\Program Files\nodejs\`
   - 点击 **Next**
4. 选择安装组件：
   - ✅ **Add to PATH**（添加到环境变量）- **必须勾选！**
   - 其他选项可以不勾选
   - 点击 **Next**
5. 点击 **Install（安装）**
6. 等待安装完成（约 1-2 分钟）
7. 点击 **Finish（完成）**

#### 1.1.3 验证 Node.js 安装

1. 按 `Win + R` 键
2. 输入：`cmd`
3. 按 `Enter` 键
4. 在命令提示符中输入：
```cmd
node --version
```
5. 应该看到类似输出：
```cmd
v18.19.0
```
6. 再输入：
```cmd
npm --version
```
7. 应该看到类似输出：
```cmd
10.2.3
```

**如果都输出了版本号，说明 Node.js 安装成功！✅**

---

### 步骤 1.2：安装 Java JDK

#### 1.2.1 下载 Java JDK

1. 打开浏览器，访问：https://adoptium.net/
2. 点击页面中间的 **"Download"** 按钮
3. 选择 **"Temurin 17"**（推荐版本）
4. 在下拉菜单中选择：
   - Version: `17 (LTS)`
   - Operating System: `Windows`
   - Architecture: `x64`（大多数电脑是 64 位）
   - Package Type: `JDK`
   - JVM: `HotSpot`
5. 点击 **"Download .msi"** 按钮

#### 1.2.2 安装 Java JDK

1. 下载完成后，双击运行 `OpenJDK17U-jdk_x64_windows_hotspot_17.x.x.msi` 文件
2. 安装向导出现后：
   - 点击 **Next（下一步）**
3. 选择安装路径：
   - 默认路径：`C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot\`
   - 点击 **Next**
4. 点击 **Install（安装）**
5. 等待安装完成（约 2-3 分钟）
6. 点击 **Finish（完成）**

**重要**：记住安装路径，后面配置环境变量需要用到！

#### 1.2.3 验证 Java 安装

1. 打开新的命令提示符窗口（关闭旧的，重新打开）：
   - 按 `Win + R` 键
   - 输入 `cmd`
   - 按 `Enter` 键
2. 输入以下命令：
```cmd
java -version
```
3. 应该看到类似输出：
```cmd
openjdk version "17.0.18" 2023-01-17
OpenJDK Runtime Environment Temurin-17.0.18+8 (build 17.0.18+8)
OpenJDK 64-Bit Server VM Temurin-17.0.18+8 (build 17.0.18+8, mixed mode, sharing)
```

**如果输出了版本信息，说明 Java 安装成功！✅**

---

### 步骤 1.3：安装 Android Studio

#### 1.3.1 下载 Android Studio

1. 打开浏览器，访问：https://developer.android.com/studio
2. 点击 **"Download Android Studio"** 按钮
3. 勾选 **"I have read and agree with the above terms and conditions"**
4. 点击 **"Download Android Studio for Windows"** 按钮
5. 文件大小约 1GB，下载可能需要几分钟

#### 1.3.2 安装 Android Studio

1. 下载完成后，双击运行 `android-studio-202x.x.x.x.x-windows.exe` 文件
2. 安装向导出现后：
   - 点击 **Next（下一步）**
3. 选择安装组件：
   - ✅ **Android Studio**
   - ✅ **Android Virtual Device (AVD)**（虚拟设备，用于模拟器）
   - 点击 **Next**
4. 选择安装路径：
   - 默认路径：`C:\Program Files\Android\Android Studio\`
   - 点击 **Next**
5. 选择开始菜单文件夹：
   - 默认即可
   - 点击 **Install**
6. 等待安装完成（约 3-5 分钟）
7. 点击 **Next**
8. 点击 **Finish（完成）**

#### 1.3.3 首次启动 Android Studio

1. 如果没有自动启动，从开始菜单启动 Android Studio
2. 会弹出 **"Android Studio Setup Wizard"**（设置向导）
3. 点击 **Next（下一步）**
4. 选择 **"Standard"**（标准安装）
   - Standard：自动安装推荐的组件
   - Custom：自定义安装（不推荐新手）
5. 点击 **Next**
6. 选择 **"Light"** 主题（亮色）或 **"Dark"** 主题（暗色）
7. 点击 **Next**
8. 检查安装设置，点击 **Finish**
9. 等待下载和安装组件（可能需要 10-30 分钟，取决于网络速度）
10. 安装完成后，点击 **Finish**
11. 会打开 **Welcome to Android Studio** 界面

#### 1.3.4 配置 Android SDK

1. 在 Android Studio 中，点击菜单栏的 **"Tools"**
2. 选择 **"SDK Manager"**
3. 切换到 **"SDK Platforms"** 标签页
4. 确认已安装 **Android 14.0 (API Level 34)**
   - 如果没有，勾选它，点击 **"Apply"** 下载安装
5. 切换到 **"SDK Tools"** 标签页
6. 确认已安装以下工具：
   - ✅ **Android SDK Build-Tools 34.0.0**
   - ✅ **Android SDK Platform-Tools**
   - ✅ **Android SDK Tools**
   - ✅ **Android Emulator**
7. 如果有未勾选的工具，勾选它们，点击 **"Apply"** 下载安装

#### 1.3.5 记录 Android SDK 路径

1. 在 **"SDK Manager"** 窗口的顶部，可以看到 **"Android SDK Location"**（Android SDK 位置）
2. 默认路径通常是：
   ```
   C:\Users\你的用户名\AppData\Local\Android\Sdk
   ```
3. **重要**：把这个路径复制到一个记事本中，后面配置环境变量需要用到！

---

## ⚙️ 第二阶段：配置 Android Studio

### 步骤 2.1：确认 SDK 路径

1. 在 Android Studio 中，点击菜单栏的 **"Tools"**
2. 选择 **"SDK Manager"**
3. 记录 **"Android SDK Location"** 的路径，例如：
   ```
   C:\Users\ZGL31\AppData\Local\Android\Sdk
   ```
4. **重要**：保存这个路径！

---

## 🔧 第三阶段：配置环境变量

### 步骤 3.1：打开环境变量设置

1. 按 `Win + R` 键
2. 输入：`sysdm.cpl`
3. 按 `Enter` 键
4. 会打开 **"系统属性"** 窗口
5. 点击 **"高级"** 标签页
6. 点击右下角的 **"环境变量"** 按钮

---

### 步骤 3.2：添加 JAVA_HOME 环境变量

1. 在 **"环境变量"** 窗口的下方 **"系统变量"** 区域：
2. 点击 **"新建"** 按钮
3. 在 **"变量名"** 框中输入：
   ```
   JAVA_HOME
   ```
4. 在 **"变量值"** 框中输入 Java JDK 的安装路径：
   ```
   C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot
   ```
   **注意**：
   - 根据你的实际安装路径填写
   - 路径末尾不要有反斜杠 `\`
   - 版本号要完整（包含 `.8`）
5. 点击 **"确定"**

---

### 步骤 3.3：添加 ANDROID_HOME 环境变量

1. 继续在 **"环境变量"** 窗口的 **"系统变量"** 区域：
2. 点击 **"新建"** 按钮
3. 在 **"变量名"** 框中输入：
   ```
   ANDROID_HOME
   ```
4. 在 **"变量值"** 框中输入 Android SDK 的路径（步骤 1.3.5 中记录的）：
   ```
   C:\Users\ZGL31\AppData\Local\Android\Sdk
   ```
   **注意**：
   - 把 `ZGL31` 替换成你实际的 Windows 用户名
   - 路径末尾不要有反斜杠 `\`
5. 点击 **"确定"**

---

### 步骤 3.4：配置 Path 环境变量

1. 在 **"环境变量"** 窗口的下方 **"系统变量"** 区域：
2. 找到名为 **"Path"** 的变量
3. 选中它，点击 **"编辑"** 按钮
4. 会打开 **"编辑环境变量"** 窗口

#### 3.4.1 添加 Java 到 Path

1. 点击右侧的 **"新建"** 按钮
2. 输入：
   ```
   %JAVA_HOME%\bin
   ```
3. 按 `Enter` 键

#### 3.4.2 添加 Android Platform-Tools 到 Path

1. 再次点击 **"新建"** 按钮
2. 输入：
   ```
   %ANDROID_HOME%\platform-tools
   ```
3. 按 `Enter` 键

#### 3.4.3 添加 Android Tools 到 Path

1. 再次点击 **"新建"** 按钮
2. 输入：
   ```
   %ANDROID_HOME%\tools
   ```
3. 按 `Enter` 键

#### 3.4.4 保存配置

1. 确认 Path 列表中包含以下三个路径（顺序不重要）：
   ```
   %JAVA_HOME%\bin
   %ANDROID_HOME%\platform-tools
   %ANDROID_HOME%\tools
   ```
2. 点击 **"确定"** 保存 Path 配置
3. 回到 **"环境变量"** 窗口，点击 **"确定"**
4. 回到 **"系统属性"** 窗口，点击 **"确定"**

---

### 步骤 3.5：验证环境变量配置

#### 3.5.1 重新启动命令提示符

**重要**：必须关闭所有命令提示符窗口，重新打开一个新的！

1. 关闭所有打开的 CMD 窗口
2. 按 `Win + R` 键
3. 输入：`cmd`
4. 按 `Enter` 键

#### 3.5.2 验证 Java

1. 在新的 CMD 窗口中输入：
```cmd
echo %JAVA_HOME%
```
2. 应该看到输出：
```cmd
C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot
```
3. 再输入：
```cmd
java -version
```
4. 应该看到 Java 版本信息

#### 3.5.3 验证 Android SDK

1. 在同一个 CMD 窗口中输入：
```cmd
echo %ANDROID_HOME%
```
2. 应该看到输出：
```cmd
C:\Users\ZGL31\AppData\Local\Android\Sdk
```
3. 再输入：
```cmd
adb version
```
4. 应该看到类似输出：
```cmd
Android Debug Bridge version 1.0.41
Version 34.0.5
```

**如果所有命令都输出了正确的信息，说明环境变量配置成功！✅✅✅**

---

## 📁 第四阶段：获取项目

### 步骤 4.1：准备项目文件夹

1. 在电脑上选择一个合适的位置存放项目，例如：
   - 桌面
   - `D:\Projects`
   - `C:\Users\你的用户名\Documents`

2. 创建一个文件夹，命名为：
   ```
   word-review
   ```

3. 打开这个文件夹

---

### 步骤 4.2：解压项目文件

1. 将 `word-review-project.tar.gz` 复制到 `word-review` 文件夹
2. 使用解压软件（7-Zip、WinRAR 等）解压该文件
3. 解压后，应该可以看到以下结构：
   ```
   word-review/
   ├── client/          ← 这是我们需要打包的项目文件夹
   ├── server/
   ├── assets/
   └── 其他文件...
   ```

---

### 步骤 4.3：确认项目结构

进入 `client` 文件夹，确认包含以下文件：

```
client/
├── app/                    ← 应用页面和路由
├── assets/                 ← 图片等资源
├── components/             ← 组件
├── constants/              ← 常量配置
├── database/               ← 数据库操作
├── hooks/                  ← React Hooks
├── screens/                ← 页面
├── utils/                  ← 工具函数
├── algorithm/              ← FSRS 算法
├── app.config.ts           ← 应用配置
├── package.json            ← 依赖配置
└── tsconfig.json           ← TypeScript 配置
```

**如果看到了这些文件，说明项目结构正确！✅**

---

## 📦 第五阶段：安装依赖

### 步骤 5.1：打开命令提示符并进入项目目录

1. 打开命令提示符（CMD）
2. 使用 `cd` 命令进入 `client` 文件夹：

   **如果项目在桌面：**
   ```cmd
   cd %USERPROFILE%\Desktop\word-review\client
   ```

   **如果项目在 D 盘：**
   ```cmd
   d:
   cd D:\Projects\word-review\client
   ```

   **提示**：你可以先进入文件夹，然后在地址栏输入 `cmd` 并按 `Enter`，这样会自动在该目录打开 CMD

3. 确认当前目录：
   ```cmd
   dir
   ```
4. 应该能看到 `package.json` 文件

---

### 步骤 5.2：安装项目依赖

#### 5.2.1 执行安装命令

1. 在 CMD 窗口中输入：
   ```cmd
   npm install
   ```

2. 按 `Enter` 键

#### 5.2.2 等待安装完成

1. npm 会开始下载并安装依赖包
2. 你会看到大量的下载信息滚动显示
3. 安装时间取决于网络速度，通常需要 3-10 分钟
4. 安装成功的标志：
   ```
   added 85 packages in 3m
   ```

#### 5.2.3 如果安装失败

如果安装失败或速度很慢，尝试使用国内镜像：

1. 设置 npm 镜像源：
   ```cmd
   npm config set registry https://registry.npmmirror.com
   ```

2. 重新安装：
   ```cmd
   npm install
   ```

#### 5.2.4 验证安装

1. 检查是否生成了 `node_modules` 文件夹：
   ```cmd
   dir node_modules
   ```
2. 如果能看到很多文件夹，说明依赖安装成功！✅

---

## 🔨 第六阶段：生成原生代码

### 步骤 6.1：执行 Prebuild 命令

1. 确认当前还在 `client` 目录中：
   ```cmd
   d:
   cd D:\Projects\word-review\client
   ```

2. 输入以下命令：
   ```cmd
   npx expo prebuild --clean
   ```

3. 按 `Enter` 键

### 步骤 6.2：等待 Prebuild 完成

1. Expo 会开始生成 Android 和 iOS 原生代码
2. 你会看到类似以下输出：
   ```
   ✔ Expo config is valid.
   ✔ Updated package.json.
   ✔ Updated app.json.
   ├── Created android/ folder
   ├── Created ios/ folder
   ```

3. 这个过程可能需要 2-5 分钟

### 步骤 6.3：验证 Prebuild 结果

1. Prebuild 完成后，检查 `client` 目录下是否生成了 `android` 文件夹：
   ```cmd
   dir android
   ```

2. 应该能看到以下结构：
   ```
   android/
   ├── app/
   ├── build.gradle
   ├── gradle/
   ├── gradlew
   ├── gradlew.bat
   └── 其他文件...
   ```

**如果看到了 `android` 文件夹，说明 Prebuild 成功！✅**

---

## 📱 第七阶段：打包 APK

### 步骤 7.1：配置 Gradle 国内镜像（解决下载慢问题）

#### 7.1.1 创建 Gradle 配置文件

1. 打开文件资源管理器
2. 进入以下路径：
   ```
   C:\Users\ZGL31\.gradle\
   ```
   （把 `ZGL31` 替换成你的用户名）

3. 如果不存在 `init.gradle` 文件，创建一个：
   - 右键 → 新建 → 文本文档
   - 命名为 `init.gradle`
   - 确保扩展名是 `.gradle`，不是 `.gradle.txt`

#### 7.1.2 编辑 init.gradle 文件

1. 用记事本打开 `init.gradle`
2. 粘贴以下内容：

```gradle
allprojects {
    repositories {
        maven { url 'https://maven.aliyun.com/repository/public/' }
        maven { url 'https://maven.aliyun.com/repository/google/' }
        maven { url 'https://maven.aliyun.com/repository/jcenter/' }
        maven { url 'https://maven.aliyun.com/repository/central/' }
        maven { url 'https://maven.aliyun.com/repository/gradle-plugin/' }
    }
}

gradle.projectsLoaded {
    rootProject.allprojects {
        repositories {
            maven { url 'https://maven.aliyun.com/repository/public/' }
            maven { url 'https://maven.aliyun.com/repository/google/' }
            maven { url 'https://maven.aliyun.com/repository/jcenter/' }
            maven { url 'https://maven.aliyun.com/repository/central/' }
            maven { url 'https://maven.aliyun.com/repository/gradle-plugin/' }
        }
    }
}
```

3. 保存文件

---

### 步骤 7.2：进入 Android 目录

1. 在 CMD 窗口中输入：
   ```cmd
   cd android
   ```

2. 确认当前目录：
   ```cmd
   dir
   ```

3. 应该能看到 `gradlew.bat` 文件

---

### 步骤 7.3：清理构建缓存（可选，但推荐）

```cmd
gradlew.bat clean
```

这会清理之前的构建缓存，避免旧文件干扰。

---

### 步骤 7.4：构建 Debug APK

#### 7.4.1 执行构建命令

1. 在 CMD 窗口中输入：
   ```cmd
   gradlew.bat assembleDebug
   ```

2. 按 `Enter` 键

#### 7.4.2 等待构建完成

1. Gradle 会开始下载依赖并构建应用
2. **首次构建会非常慢**，可能需要 15-30 分钟（下载依赖 + 编译）
3. 你会看到大量的输出信息滚动
4. 最终成功的标志：
   ```
   BUILD SUCCESSFUL in 5m 32s
   43 actionable tasks: 43 executed
   ```

#### 7.4.3 如果构建失败

如果构建失败，尝试以下方法：

1. 清理构建缓存：
   ```cmd
   gradlew.bat clean
   ```

2. 重新构建：
   ```cmd
   gradlew.bat assembleDebug
   ```

3. 如果还是失败，尝试增加内存限制：
   ```cmd
   gradlew.bat assembleDebug -Xmx2048m
   ```

---

### 步骤 7.5：查找 APK 文件

#### 7.5.1 定位 APK 文件

APK 文件位于：
```
android\app\build\outputs\apk\debug\app-debug.apk
```

#### 7.5.2 验证 APK 存在

1. 在 CMD 中输入：
   ```cmd
   dir app\build\outputs\apk\debug
   ```

2. 应该能看到 `app-debug.apk` 文件

3. 检查文件大小（应该至少 10MB 以上）：
   ```cmd
   dir app\build\outputs\apk\debug\app-debug.apk
   ```

#### 7.5.3 在文件资源管理器中打开

1. 在 CMD 中输入：
   ```cmd
   explorer app\build\outputs\apk\debug
   ```

2. 这会打开文件资源管理器，显示 APK 文件
3. 你可以看到 `app-debug.apk` 文件

**成功！APK 文件已经生成了！✅✅✅**

---

## 📲 第八阶段：安装到手机

### 步骤 8.1：准备工作

#### 8.1.1 手机设置

1. 打开手机的 **"设置"**
2. 找到 **"关于手机"** 或 **"关于设备"**
3. 连续点击 **"版本号"** 7 次，直到提示 **"您已处于开发者模式"**
4. 返回设置主页，找到 **"开发者选项"**
5. 打开 **"USB 调试"** 开关

#### 8.1.2 允许安装未知来源

1. 在手机设置中，找到 **"安全"** 或 **"隐私"**
2. 打开 **"允许安装未知来源应用"** 或 **"USB 安装"**
3. 或者在安装 APK 时，系统会提示是否允许

---

### 步骤 8.2：通过 USB 安装（推荐）

#### 8.2.1 连接手机到电脑

1. 使用 USB 数据线连接手机和电脑
2. 手机上会弹出 **"允许 USB 调试"** 提示
3. 勾选 **"始终允许使用这台计算机进行调试"**
4. 点击 **"允许"** 或 **"确定"**

#### 8.2.2 验证连接

1. 在 CMD 中输入：
   ```cmd
   adb devices
   ```

2. 应该看到类似输出：
   ```
   List of devices attached
   XXXXXXXXXXXXXXXX    device
   ```

3. 如果看到了设备信息，说明连接成功！

#### 8.2.3 安装 APK

1. 在 CMD 中输入：
   ```cmd
   adb install app\build\outputs\apk\debug\app-debug.apk
   ```

2. 按 `Enter` 键

3. 安装成功的标志：
   ```
   Success
   ```

4. 在手机上，你应该能看到 **"编码记忆法"** 应用图标

---

### 步骤 8.3：通过文件传输安装（备选方案）

#### 8.3.1 传输 APK 到手机

1. 使用 USB 数据线连接手机到电脑
2. 在电脑上打开 **"此电脑"**
3. 找到手机设备（通常显示为手机型号）
4. 双击打开手机
5. 找到 **"内部存储"** 或 **"Phone"**
6. 将 `app-debug.apk` 文件复制到手机中（可以创建一个 `APK` 文件夹）

#### 8.3.2 在手机上安装

1. 断开手机与电脑的连接
2. 打开手机的 **"文件管理"** 应用
3. 找到刚刚复制的 `app-debug.apk` 文件
4. 点击该文件
5. 系统会提示是否安装未知来源应用
6. 点击 **"设置"**，允许来自 **"文件管理"** 的安装
7. 返回，再次点击 APK 文件
8. 点击 **"安装"**
9. 等待安装完成
10. 点击 **"打开"** 或 **"完成"**

---

### 步骤 8.4：首次启动应用

1. 在手机上找到 **"编码记忆法"** 应用图标
2. 点击打开
3. 首次启动可能需要几秒钟初始化数据库
4. 初始化完成后，你将看到应用主界面

---

## 🎉 完成！

### 应用功能验证

现在你可以在手机上使用以下功能：

| 功能 | 说明 |
|------|------|
| ✅ **添加单词** | 输入单词、词性、释义 |
| ✅ **智能拆分** | 自动拆分单词为编码 |
| ✅ **助记生成** | 根据拆分生成助记句 |
| ✅ **音标查询** | 本地音标数据库 |
| ✅ **词库管理** | 创建和管理词库 |
| ✅ **智能复习** | FSRS 算法驱动的复习系统 |
| ✅ **掌握追踪** | 实时学习进度统计 |
| ✅ **完全单机** | 无需联网 |

---

## 📝 完整命令速查

```cmd
# ========== 第一阶段：验证环境 ==========
node --version
java -version
adb version

# ========== 第五阶段：安装依赖 ==========
d:
cd D:\Projects\word-review\client
npm install

# ========== 第六阶段：生成原生代码 ==========
npx expo prebuild --clean

# ========== 第七阶段：打包 APK ==========
cd android
gradlew.bat clean
gradlew.bat assembleDebug

# ========== 第八阶段：安装到手机 ==========
adb devices
adb install app\build\outputs\apk\debug\app-debug.apk
```

---

## ⏱️ 预计时间

| 阶段 | 时间 |
|------|------|
| 安装软件 | 30-60 分钟 |
| 配置环境变量 | 10 分钟 |
| 安装依赖 | 5-10 分钟 |
| 生成原生代码 | 3-5 分钟 |
| 构建 APK | 15-30 分钟 |
| 安装到手机 | 5 分钟 |
| **总计** | **约 70-120 分钟** |

---

## ❓ 常见问题快速解决

| 问题 | 解决方法 |
|------|---------|
| `node` 命令找不到 | 检查环境变量 Path |
| `java` 命令找不到 | 检查 JAVA_HOME 和 Path |
| `adb` 命令找不到 | 检查 ANDROID_HOME 和 Path |
| `npm install` 失败 | 使用国内镜像，重新安装 |
| Gradle 下载超时 | 配置 Gradle 国内镜像 |
| Gradle 构建失败 | `gradlew.bat clean`，重新构建 |
| 手机连接不上 ADB | 重启 ADB，更换 USB 线 |
| APK 安装失败 | `adb uninstall com.wordreview.app`，重新安装 |

---

## 🎯 核心要点

1. **环境变量必须正确**：JAVA_HOME、ANDROID_HOME、Path
2. **必须关闭所有 CMD 窗口后重新打开**，环境变量才能生效
3. **配置 Gradle 国内镜像**，解决下载慢问题
4. **首次构建 APK 会很慢**（15-30 分钟），耐心等待
5. **必须开启 USB 调试**，否则无法连接手机
6. **必须允许安装未知来源应用**，否则无法安装 APK

---

## 📱 应用信息

| 项目 | 值 |
|------|-----|
| 应用名称 | 编码记忆法 |
| 版本号 | 1.0.0 |
| 包名 | com.wordreview.app |
| 最低要求 | Android 5.0+ |
| 网络 | 无需联网 |

---

**祝打包顺利！🎉**

开始按照上面的步骤操作吧！每一步都很详细，跟着做就能成功！🚀
