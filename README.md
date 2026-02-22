# Expo App + Express.js

## 目录结构规范（严格遵循）

当前仓库是一个 monorepo（基于 pnpm 的 workspace）

- Expo 代码在 client 目录，Express.js 代码在 server 目录
- 本模板默认无 Tab Bar，可按需改造

目录结构说明

├── server/                     # 服务端代码根目录 (Express.js)
|   ├── src/
│   │   └── index.ts            # Express 入口文件
|   └── package.json            # 服务端 package.json
├── client/                     # React Native 前端代码
│   ├── app/                    # Expo Router 路由目录（仅路由配置）
│   │   ├── _layout.tsx         # 根布局文件（必需，务必阅读）
│   │   ├── home.tsx            # 首页
│   │   └── index.tsx           # re-export home.tsx
│   ├── screens/                # 页面实现目录（与 app/ 路由对应）
│   │   └── demo/               # demo 示例页面
│   │       ├── index.tsx       # 页面组件实现
│   │       └── styles.ts       # 页面样式
│   ├── components/             # 可复用组件
│   │   └── Screen.tsx          # 页面容器组件（必用）
│   ├── hooks/                  # 自定义 Hooks
│   ├── contexts/               # React Context 代码
│   ├── constants/              # 常量定义（如主题配置）
│   ├── utils/                  # 工具函数
│   ├── assets/                 # 静态资源
|   └── package.json            # Expo 应用 package.json
├── package.json
├── .cozeproj                   # 预置脚手架脚本（禁止修改）
└── .coze                       # 配置文件（禁止修改）

## 安装依赖

### 命令

```bash
pnpm i
```

### 新增依赖约束

如果需要新增依赖，需在 client 和 server 各自的目录添加（原因：隔离前后端的依赖），禁止在根目录直接安装依赖

### 新增依赖标准流程

- 编辑 `client/package.json` 或 `server/package.json`
- 在根目录执行 `pnpm i`

## Expo 开发规范

### 路径别名

Expo 配置了 `@/` 路径别名指向 `client/` 目录：

```tsx
// 正确
import { Screen } from '@/components/Screen';

// 避免相对路径
import { Screen } from '../../../components/Screen';
```

## 本地开发

运行 coze dev 可以同时启动前端和后端服务，如果端口已占用，该命令会先杀掉占用端口的进程再启动，也可以用来重启前端和后端服务

```bash
coze dev
```

## 法律文档

本应用包含完整的法律文档，位于 `docs/legal/` 目录：

- **隐私政策** - 说明数据收集和使用方式（本应用完全离线，不上传数据）
- **用户协议** - 规范用户使用应用的权利和义务
- **应用权限说明** - 详细说明应用请求的各项权限及其用途

详细使用说明请查看 [docs/README.md](./docs/README.md) 和 [docs/legal/README.md](./docs/legal/README.md)。

## 应用特色

- ✅ 完全离线运行，无需网络连接
- ✅ 所有数据存储在本地 SQLite 数据库
- ✅ 不收集任何个人信息
- ✅ 基于艾宾浩斯记忆法的智能复习
- ✅ 编码拆分记忆法，高效记忆单词
- ✅ 支持批量导入和导出
- ✅ 无内购，完全免费

## 核心功能

- **单词本管理** - 创建、编辑、分类管理单词词库
- **智能复习** - 根据遗忘曲线自动安排复习计划
- **刷单词模式** - 卡片式学习体验
- **编码拆分** - 将单词拆分为编码，辅助记忆
- **批量导入** - 支持 CSV/JSON 格式批量导入
- **数据导出** - 导出学习数据，便于备份

## 技术栈

- **前端**：Expo 54 + React Native + TypeScript
- **数据库**：SQLite (expo-sqlite)
- **状态管理**：React Context + Hooks
- **导航**：Expo Router
- **主题系统**：支持亮色/暗色主题
- **后端**：Express.js (已移除，应用完全单机运行)

## 打包发布

### 开发版本测试

```bash
# Android
cd client && eas build --platform android --profile development

# iOS
cd client && eas build --platform ios --profile development
```

### 生产版本构建

```bash
# Android App Bundle
cd client && eas build --platform android --profile production

# iOS (需要 Apple 开发者账号)
cd client && eas build --platform ios --profile production
```

详细打包说明请参考 [Expo 官方文档](https://docs.expo.dev/build/introduction/)。

## 许可证

Copyright © 2025. All rights reserved.
