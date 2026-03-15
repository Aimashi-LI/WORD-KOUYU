# 本地构建 APK 指南

## 方案一：GitHub Actions 本地构建（推荐）

### 优点
- ✅ 不需要 EXPO_TOKEN
- ✅ 自动化构建
- ✅ 免费（使用 GitHub 免费额度）
- ✅ 自动上传到 GitHub Artifacts

### 操作步骤

#### 1️⃣ 推送代码到 GitHub
```bash
cd /workspace/projects
git init
git add .
git commit -m "Add build configuration"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

#### 2️⃣ 触发构建
推送代码后会自动触发构建，或者你可以：
1. 进入 GitHub 仓库 → Actions 标签
2. 选择 "Build Android APK (Local Build)" 工作流
3. 点击 "Run workflow"

#### 3️⃣ 下载 APK
- 等待 20-30 分钟构建完成
- 在 Actions 页面点击对应的工作流运行记录
- 滚动到底部 → 下载 `app-apk` 文件

### 注意事项
- 构建时间较长：首次构建可能需要 20-30 分钟
- macOS runner 有限制：GitHub 免费账户每月有 2000 分钟的 macOS 构建时间
- 网络稳定性：确保网络连接稳定

---

## 方案二：本地脚本构建

### 优点
- ✅ 完全本地构建，不需要 GitHub
- ✅ 可以在开发时快速测试
- ✅ 不受 GitHub 限制

### 前置要求
- Node.js 20+
- npm
- Java 17+
- Android SDK

### 操作步骤

#### 1️⃣ 安装依赖
```bash
cd /workspace/projects
npm install
```

#### 2️⃣ 运行构建脚本
```bash
# 添加执行权限
chmod +x build-local-apk.sh

# 运行构建脚本
./build-local-apk.sh
```

#### 3️⃣ 等待构建完成
- 构建时间：10-20 分钟（取决于你的机器性能）
- 构建完成后，APK 文件会在 `./app-release.apk`

#### 4️⃣ 安装 APK
```bash
# 通过 USB 安装到 Android 设备
adb install app-release.apk

# 或直接复制到设备安装
```

---

## 方案对比

| 特性 | GitHub Actions | 本地脚本 |
|------|---------------|----------|
| 需要 EXPO_TOKEN | ❌ 不需要 | ❌ 不需要 |
| 构建环境 | GitHub macOS runner | 你的机器 |
| 构建时间 | 20-30 分钟 | 10-20 分钟 |
| 自动化 | ✅ 完全自动化 | ❌ 需要手动运行 |
| 网络要求 | 需要网络连接 | 需要网络连接 |
| 成本 | 免费（有限额） | 免费（无限制） |
| 适用场景 | 持续集成/发布 | 开发测试 |

---

## 常见问题

### Q1: GitHub Actions 构建失败怎么办？
**A**:
1. 检查 Actions 日志，查看具体错误信息
2. 确认代码已正确推送到 GitHub
3. 尝试手动重新运行工作流

### Q2: 本地构建失败怎么办？
**A**:
1. 检查是否安装了 Node.js、Java、Android SDK
2. 运行 `npm install` 安装依赖
3. 检查磁盘空间是否足够（至少 5GB）

### Q3: APK 安装后闪退怎么办？
**A**:
1. 检查 `app.config.ts` 配置是否正确
2. 检查数据库和 API 连接是否正常
3. 查看设备日志：`adb logcat`

### Q4: 如何加速构建过程？
**A**:
- 本地构建：使用更好的硬件配置
- GitHub Actions：使用缓存（已配置）

---

## 进阶配置

### 1. 自定义应用图标和名称
修改 `client/app.config.ts`:
```typescript
export default {
  name: "你的应用名称",
  icon: "./assets/images/icon.png",
  // ...
}
```

### 2. 配置不同的构建环境
修改 `client/eas.json`:
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### 3. 发布到 GitHub Releases
```bash
# 打标签
git tag v1.0.0
git push origin v1.0.0

# 这会自动创建 Release 并上传 APK
```

---

## 相关资源

- [Expo 官方文档](https://docs.expo.dev/)
- [EAS Build 文档](https://docs.expo.dev/build/introduction/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
