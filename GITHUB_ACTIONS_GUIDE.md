# GitHub Actions APK 构建操作指南

## 🚀 开始构建（3步）

### 第一步：设置 GitHub 远程仓库
```bash
cd /workspace/projects
git remote add origin https://github.com/[你的GitHub用户名]/[你的仓库名].git
```

**示例**：
```bash
git remote add origin https://github.com/zhangsan/word-review-app.git
```

### 第二步：推送代码到 GitHub
```bash
git push -u origin main
```

**如果遇到错误**：
```bash
# 如果远程仓库已经存在内容，使用强制推送
git push -u origin main --force

# 或者先拉取远程内容
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### 第三步：等待构建完成
1. 打开浏览器，访问你的 GitHub 仓库
2. 点击 **"Actions"** 标签
3. 找到 **"Build Android APK (Local Build)"** 工作流
4. 点击对应的工作流运行记录
5. 等待构建完成（预计 **20-30 分钟**）

---

## 📥 下载 APK 文件

### 方法一：从 GitHub Actions 下载
1. 在 Actions 页面，点击对应的工作流运行记录
2. 向下滚动到 **"Artifacts"** 部分
3. 点击 **"app-apk"** 文件下载
4. 解压后得到 `.apk` 文件

### 方法二：从 GitHub Releases 下载（如果创建了 Release）
1. 点击 **"Releases"** 标签
2. 点击对应的 Release 版本
3. 下载 APK 文件

---

## 🔄 手动触发构建

如果不想推送代码，可以手动触发构建：

1. 打开你的 GitHub 仓库
2. 点击 **"Actions"** 标签
3. 选择 **"Build Android APK (Local Build)"** 工作流
4. 点击右侧的 **"Run workflow"** 按钮
5. 选择分支（通常是 `main`）
6. 点击 **"Run workflow"** 确认

---

## 📊 查看构建状态

### 构建状态说明
- ⏳ **黄色圆点**：正在构建中
- ✅ **绿色勾号**：构建成功
- ❌ **红色叉号**：构建失败
- 🟡 **黄色感叹号**：构建被取消

### 查看构建日志
1. 在 Actions 页面点击对应的工作流运行记录
2. 展开具体的步骤（如 "Build Android APK"）
3. 可以看到详细的构建日志

---

## 📱 安装和测试

### 通过 USB 安装到 Android 设备
```bash
# 连接设备并启用 USB 调试
adb devices

# 安装 APK
adb install app-release.apk
```

### 直接复制到设备安装
1. 将 APK 文件复制到 Android 设备
2. 在设备上点击 APK 文件
3. 允许安装未知来源的应用
4. 完成安装

---

## ⚠️ 常见问题

### Q1: 推送代码时提示 "remote origin already exists"
**A**:
```bash
# 移除现有的远程仓库
git remote remove origin

# 重新设置远程仓库
git remote add origin https://github.com/[你的用户名]/[你的仓库名].git
```

### Q2: 构建失败，提示 "EAS CLI not found"
**A**: 这个问题已经修复，配置文件会自动安装 EAS CLI。

### Q3: 构建失败，提示 "Java not found"
**A**: 这个问题已经修复，配置文件会自动设置 Java 环境。

### Q4: 构建时间过长
**A**:
- 首次构建可能需要 20-30 分钟
- 后续构建会更快（因为有缓存）
- 可以在 Actions 页面查看实时进度

### Q5: 找不到 APK 文件
**A**:
- 确认构建状态是 ✅ 绿色勾号（成功）
- 检查 Artifacts 部分是否有 `app-apk` 文件
- 如果没有，查看构建日志寻找错误信息

---

## 🎉 成功！

构建成功后，你就可以：
1. 📱 在 Android 设备上安装 APK
2. 🧪 测试应用功能
3. 📲 分享 APK 给其他人

---

## 📚 参考文档

- [详细构建指南](./BUILD_LOCAL_GUIDE.md)
- [快速开始指南](./QUICK_START.md)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Expo 构建文档](https://docs.expo.dev/build/introduction/)

---

## 💡 提示

- **构建时间**：首次构建需要 20-30 分钟
- **免费额度**：GitHub 免费账户每月有 2000 分钟的 macOS 构建时间
- **自动触发**：每次推送到 `main` 分支都会自动触发构建
- **手动触发**：也可以手动触发构建，无需推送代码
