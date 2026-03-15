# 快速开始 - APK 打包指南（无需 EXPO_TOKEN）

## 方案选择

### 方案一：GitHub Actions 自动构建（推荐）⭐
适合：持续集成、自动化发布
- ✅ 不需要 EXPO_TOKEN
- ✅ 自动化构建
- ✅ 免费使用

### 方案二：本地脚本构建
适合：开发测试、快速迭代
- ✅ 完全本地构建
- ✅ 不受 GitHub 限制
- ✅ 快速测试

---

## 方案一：GitHub Actions 自动构建（5分钟）

### 第一步：推送代码到 GitHub
```bash
cd /workspace/projects
git init
git add .
git commit -m "Add build configuration"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

### 第二步：等待构建
- 访问 GitHub 仓库 → Actions 标签
- 等待 "Build Android APK (Local Build)" 工作流完成（约 20-30 分钟）

### 第三步：下载 APK
- 在 Actions 页面点击对应的工作流运行记录
- 滚动到底部 → 下载 `app-apk` 文件

---

## 方案二：本地脚本构建（10分钟）

### 第一步：运行构建脚本
```bash
cd /workspace/projects
./build-local-apk.sh
```

### 第二步：等待构建完成
- 构建时间：10-20 分钟
- APK 文件会在 `./app-release.apk`

### 第三步：安装测试
```bash
# 通过 USB 安装
adb install app-release.apk
```

---

## 文件清单

```
必需文件：
✅ .github/workflows/build-android-apk.yml  # GitHub Actions 配置
✅ client/eas.json                          # EAS 构建配置
✅ client/app.config.ts                     # Expo 应用配置
✅ build-local-apk.sh                      # 本地构建脚本（已添加执行权限）

可选配置：
⚠️  不需要 EXPO_TOKEN（两种方案都不需要）
```

---

## 常用命令

### GitHub Actions
```bash
# 查看构建状态
# 访问 GitHub 仓库 → Actions 标签

# 重新运行构建
# 在 Actions 页面点击对应工作流 → Re-run jobs
```

### 本地构建
```bash
# 运行构建脚本
./build-local-apk.sh

# 查看构建日志
# 脚本运行时会实时显示构建过程

# 安装 APK 到设备
adb install app-release.apk
```

---

## 下一步

遇到问题？查看详细文档：
- **本地构建指南**：[BUILD_LOCAL_GUIDE.md](./BUILD_LOCAL_GUIDE.md)
- **完整操作指南**：[BUILD_APK_GUIDE.md](./BUILD_APK_GUIDE.md)

---

## 快速对比

| 特性 | GitHub Actions | 本地脚本 |
|------|---------------|----------|
| 构建时间 | 20-30 分钟 | 10-20 分钟 |
| 自动化 | ✅ 完全自动化 | ❌ 需要手动运行 |
| 网络要求 | 需要 | 需要 |
| 适用场景 | 发布 | 测试 |
