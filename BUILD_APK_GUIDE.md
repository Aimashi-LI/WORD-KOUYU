# Android APK 构建指南

## 方案选择

由于本地 Windows 环境配置困难，我们提供以下构建方案：

### 方案一：使用 Docker 构建（推荐）⭐

这是最简单的方案，Docker 会自动配置所有环境。

#### 前置要求

1. 安装 Docker Desktop
   - Windows: https://www.docker.com/products/docker-desktop/
   - 安装后启动 Docker Desktop

#### 构建步骤

1. **打开命令行（CMD 或 PowerShell）**

2. **进入项目目录**

```bash
cd D:\workspace\projects
```

3. **构建 APK**

```bash
docker run --rm -v %cd%:/workspace -w /workspace/client \
  -e EXPO_TOKEN=your_expo_token \
  node:18-bullseye \
  bash -c "
    npm install -g eas-cli &&
    npm install &&
    eas build -p android --profile preview --non-interactive
  "
```

4. **下载 APK**

构建完成后，APK 文件会显示在命令行输出中，点击下载链接即可。

---

### 方案二：使用 GitHub Actions（需要 GitHub 账户）

如果您有 GitHub 账户，可以使用 GitHub Actions 自动构建。

#### 步骤

1. **创建 GitHub 仓库**
   - 访问 https://github.com/new
   - 创建新仓库（例如：`memory-app`）
   - 不要初始化 README

2. **推送代码到 GitHub**

在项目目录执行：

```bash
cd D:\workspace\projects

# 初始化 Git
git init
git add .
git commit -m "Initial commit"

# 连接到 GitHub
git remote add origin https://github.com/你的用户名/memory-app.git

# 推送代码
git branch -M main
git push -u origin main
```

3. **触发构建**

- 访问：https://github.com/你的用户名/memory-app/actions
- 点击 "Build Android APK" 工作流
- 点击 "Run workflow" 按钮
- 等待构建完成

4. **下载 APK**

- 构建完成后，进入 Actions 页面
- 点击最新的工作流
- 在 "Artifacts" 部分下载 APK

---

### 方案三：使用云服务器构建

如果您有云服务器（阿里云、腾讯云等），可以在服务器上构建。

#### 步骤

1. **连接到云服务器**

```bash
ssh root@your_server_ip
```

2. **安装 Node.js 和 Expo CLI**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
npm install -g @expo/cli eas-cli
```

3. **克隆项目**

```bash
git clone https://github.com/你的用户名/memory-app.git
cd memory-app/client
```

4. **构建 APK**

```bash
npm install
eas build -p android --profile preview
```

5. **下载 APK**

使用 SCP 或 FTP 将 APK 文件下载到本地。

---

## 注意事项

### 关于 Expo 账户

- **方案一和三** 需要 Expo 账户
- 如果无法注册，可以尝试使用邮箱注册：https://expo.dev
- 或者使用 GitHub 账户登录

### 关于单机版本

当前项目包含：
- ✅ 前端（React Native + Expo）
- ✅ 后端（Express.js API）

如果需要**纯单机版本**（无需后端），需要：
1. 使用本地存储（SQLite）替代后端 API
2. 修改前端代码，改用本地数据

### APK 安装

构建完成后：
1. 将 APK 传输到 Android 设备
2. 在设备上启用"未知来源"安装
3. 点击 APK 文件安装

---

## 快速开始（推荐）

**如果您有 Docker，使用方案一（最快）**
**如果您有 GitHub，使用方案二（最稳定）**
**如果您有云服务器，使用方案三（最灵活）**

---

## 需要帮助？

如果遇到问题，请提供：
1. 使用的方案（一、二、三）
2. 错误信息截图
3. 执行的命令和输出
