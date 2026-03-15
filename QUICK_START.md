# 快速开始 - APK 打包指南

## 5 分钟快速上手

### 第一步：配置 Expo Token
1. 访问 [https://expo.dev](https://expo.dev) 注册/登录
2. 进入 Settings → Access Tokens → Create New Token
3. 复制 Token

### 第二步：添加到 GitHub Secrets
1. 打开你的 GitHub 仓库
2. Settings → Secrets and variables → Actions
3. Name: `EXPO_TOKEN` → 粘贴 Token

### 第三步：推送代码
```bash
cd /workspace/projects
git add .
git commit -m "Build APK"
git push origin main
```

### 第四步：等待构建
- 访问 GitHub 仓库 → Actions 标签
- 等待 "Build Android APK" 工作流完成（约 10-20 分钟）

### 第五步：下载 APK
- 在 Actions 页面点击对应的工作流运行记录
- 滚动到底部 → 下载 `app-apk` 文件

## 常用命令

```bash
# 本地测试构建（需要配置环境）
cd client
eas build --platform android --profile preview --local

# 查看构建状态
eas build:list --platform=android

# 查看构建日志
eas build:view [BUILD_ID]
```

## 文件清单

```
必需文件：
✅ .github/workflows/build-android-apk.yml  # GitHub Actions 配置
✅ client/eas.json                          # EAS 构建配置
✅ client/app.config.ts                     # Expo 应用配置

必需配置：
✅ GitHub Secrets: EXPO_TOKEN               # Expo 访问令牌
```

## 下一步

遇到问题？查看详细文档：[BUILD_APK_GUIDE.md](./BUILD_APK_GUIDE.md)
