# 通过 GitHub Actions 打包 APK 操作步骤

## 前置准备

### 1. Expo 账号和 EAS 配置

#### 1.1 注册 Expo 账号
- 访问 [https://expo.dev](https://expo.dev) 注册账号
- 登录后创建一个新的项目

#### 1.2 安装 EAS CLI
```bash
npm install -g eas-cli
```

#### 1.3 登录 Expo 账号
```bash
eas login
```

#### 1.4 配置项目
```bash
cd /workspace/projects/client
eas build:configure
```

### 2. 获取 Expo Token

#### 2.1 在 Expo 账户设置中生成 Token
1. 访问 [https://expo.dev/accounts](https://expo.dev/accounts)
2. 点击右上角头像 → "Settings"
3. 找到 "Access Tokens" 部分
4. 点击 "Create New Token"
5. 输入 Token 名称（例如：GitHub Actions）
6. 选择权限（建议选择 "Build" 和 "Submit"）
7. 复制生成的 Token

#### 2.2 将 Token 添加到 GitHub Secrets
1. 进入你的 GitHub 仓库
2. 点击 "Settings" → "Secrets and variables" → "Actions"
3. 点击 "New repository secret"
4. Name: `EXPO_TOKEN`
5. Secret: 粘贴刚才复制的 Token
6. 点击 "Add secret"

## 3. 配置 GitHub 仓库

### 3.1 推送代码到 GitHub
```bash
cd /workspace/projects
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

### 3.2 验证文件结构
确保你的仓库包含以下文件：
```
/workspace/projects/
├── .github/
│   └── workflows/
│       └── build-android-apk.yml
├── client/
│   ├── app.config.ts
│   ├── eas.json
│   ├── package.json
│   └── ...
├── server/
│   └── ...
└── README.md
```

## 4. 触发构建

### 4.1 自动触发（推送代码）
```bash
# 提交并推送代码到 main 分支
git add .
git commit -m "Ready to build APK"
git push origin main
```

### 4.2 手动触发
1. 进入你的 GitHub 仓库
2. 点击 "Actions" 标签
3. 选择 "Build Android APK" 工作流
4. 点击 "Run workflow" → "Run workflow"

## 5. 下载 APK

### 5.1 从 GitHub Actions 下载
1. 进入 GitHub 仓库的 "Actions" 标签
2. 点击对应的工作流运行记录
3. 向下滚动到 "Artifacts" 部分
4. 下载 `app-apk` 文件
5. 解压后得到 `.apk` 文件

### 5.2 从 Release 下载（如果创建了 Release）
1. 进入 GitHub 仓库的 "Releases" 标签
2. 点击对应的 Release 版本
3. 下载 APK 文件

## 6. 安装和测试

### 6.1 在 Android 设备上安装
```bash
# 通过 USB 安装
adb install your-app.apk

# 或者直接复制到设备上安装
```

### 6.2 在模拟器上测试
```bash
# 启动 Android 模拟器
emulator -avd your_avd_name

# 安装 APK
adb install your-app.apk
```

## 常见问题

### Q1: 构建失败，提示 EXPO_TOKEN 错误
**A**: 检查 GitHub Secrets 中的 EXPO_TOKEN 是否正确配置。

### Q2: 构建成功但无法下载 APK
**A**:
- 检查工作流日志，确认构建成功
- 检查 Artifacts 部分，确认 APK 文件已上传
- 尝试重新运行工作流

### Q3: APK 安装后闪退
**A**:
- 检查 app.config.ts 中的配置是否正确
- 检查数据库和 API 连接是否正常
- 查看设备日志：`adb logcat`

### Q4: 如何修改应用图标和名称
**A**:
- 修改 `client/app.config.ts` 中的 `name` 字段
- 替换 `client/assets/images/` 下的图标文件

## 进阶配置

### 1. 创建 Release 版本
```bash
# 打标签
git tag v1.0.0
git push origin v1.0.0

# 这会自动创建 Release 并上传 APK
```

### 2. 配置多个构建环境
修改 `eas.json` 文件，添加不同的构建配置：
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

### 3. 自定义构建参数
在 GitHub Actions 工作流中添加：
```yaml
- name: 🏗️ Build Android APK
  working-directory: ./client
  run: eas build --platform android --profile production --non-interactive
```

## 注意事项

1. **构建时间**：EAS 构建通常需要 10-20 分钟，请耐心等待
2. **构建配额**：Expo 免费账户每月有有限的构建次数
3. **Token 安全**：不要将 EXPO_TOKEN 提交到代码仓库
4. **网络环境**：确保网络连接稳定，避免构建中断
5. **版本管理**：使用 Git 标签管理版本，便于追踪和发布

## 参考文档

- [Expo 官方文档](https://docs.expo.dev/)
- [EAS Build 文档](https://docs.expo.dev/build/introduction/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
