# 火山引擎部署指南

## 方式一：AppHost（推荐，最简单）

### 步骤 1：安装 AppHost CLI
```bash
npm install -g @volcengine/apphost
```

### 步骤 2：登录
```bash
apphost login
```

### 步骤 3：部署
```bash
cd server
apphost deploy
```

---

## 方式二：容器部署

### 步骤 1：构建 Docker 镜像
```bash
cd server
docker build -t word-review-backend .
```

### 步骤 2：推送到镜像仓库
```bash
# 先登录火山引擎镜像仓库
docker login cr-cn-beijing.volces.com

# 打标签
docker tag word-review-backend cr-cn-beijing.volces.com/your-namespace/word-review-backend:latest

# 推送
docker push cr-cn-beijing.volces.com/your-namespace/word-review-backend:latest
```

### 步骤 3：在火山引擎控制台创建容器实例
1. 进入容器实例控制台
2. 创建实例，选择刚才推送的镜像
3. 配置端口映射：8080 -> 8080
4. 配置环境变量（如需要）

---

## 方式三：云函数 SCF

### 步骤 1：准备代码
```bash
cd server
npm install --production
npm run build
```

### 步骤 2：上传到云函数
1. 进入云函数控制台
2. 创建函数，选择 Node.js 18
3. 上传代码包（包含 node_modules 和 dist 目录）
4. 配置环境变量
5. 设置触发器（API网关）

### 代码包结构
```
├── dist/          # 构建后的代码
├── node_modules/  # 生产依赖
├── package.json   # 依赖声明
└── package-lock.json
```

---

## 环境变量配置

部署时需要配置以下环境变量（根据你的实际后端服务）：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| PORT | 服务端口 | 8080 |
| NODE_ENV | 运行环境 | production |
| DB_HOST | 数据库地址 | localhost |
| DB_PORT | 数据库端口 | 5432 |
| DB_NAME | 数据库名 | word_review |
| DB_USER | 数据库用户 | postgres |
| DB_PASSWORD | 数据库密码 | ****** |
| SUPABASE_URL | Supabase 项目地址 | https://xxx.supabase.co |
| SUPABASE_ANON_KEY | Supabase Anon Key | eyJxxx |

---

## 部署后验证

部署完成后，访问：
```
https://your-domain.com/api/v1/health
```

应返回：
```json
{"status": "ok"}
```

---

## APK 配置

部署成功后，将获得的域名配置到 App 的"后端服务地址"中：
```
https://your-domain.com
```
