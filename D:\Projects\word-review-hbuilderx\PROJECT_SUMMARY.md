# HBuilderX 单词记忆应用 - 项目总结

## 📦 项目概述

这是一个使用 **HBuilderX (uni-app)** 框架开发的单词记忆应用，可以直接在 HBuilderX 中打包为 Android APK，无需复杂的 Gradle 配置。

## 🎯 项目对比

### 两个项目版本

| 项目 | 路径 | 技术栈 | 打包方式 | 网络要求 |
|------|------|--------|----------|----------|
| **React Native 版本** | `D:\Projects\word-review\client\` | Expo 54 + React Native | Android Studio + Gradle | 需要稳定的 Gradle 依赖下载 |
| **HBuilderX 版本** | `D:\Projects\word-review-hbuilderx\` | HBuilderX + uni-app | HBuilderX 云/本地打包 | 需要网络（云打包） |

### 为什么创建 HBuilderX 版本？

1. **网络问题**: React Native 版本的 Gradle 依赖下载需要稳定的网络，国内网络经常失败
2. **配置复杂**: React Native 需要配置 Android SDK、Gradle、签名等，学习曲线陡峭
3. **打包困难**: 需要解决依赖冲突、仓库配置等问题
4. **开发效率**: HBuilderX 提供了一站式开发环境，打包更简单

## 📁 项目结构

```
D:\Projects\word-review-hbuilderx/
├── pages/                          # 页面目录
│   ├── index/                      # 首页（单词列表）
│   │   └── index.vue               # 单词列表页面
│   ├── detail/                     # 详情页
│   │   └── detail.vue              # 单词详情页面
│   └── review/                     # 复习页
│       └── review.vue              # 智能复习页面
├── static/                         # 静态资源目录
│   ├── README.md                   # 静态资源说明
│   └── index.css                   # H5 全局样式
├── App.vue                         # 应用入口
├── main.js                         # 主入口文件
├── manifest.json                   # 应用配置文件
├── pages.json                      # 页面配置文件
├── package.json                    # 依赖配置文件
├── uni.scss                        # 全局样式变量
├── index.html                      # H5 入口文件
├── vite.config.js                  # Vite 配置文件
├── tsconfig.json                   # TypeScript 配置
├── .gitignore                      # Git 忽略文件
├── README.md                       # 项目说明文档
└── PROJECT_SUMMARY.md              # 本文件（项目总结）
```

## 🚀 核心功能

### 1. 单词管理
- ✅ 添加新单词
- ✅ 查看单词列表
- ✅ 删除单词
- ✅ 搜索单词
- ✅ 按不同方式排序（复习时间、掌握程度、复习次数）

### 2. 单词学习
- ✅ 单词拆分（点击字母拆分记忆）
- ✅ 助记句（自定义助记句子）
- ✅ 例句展示
- ✅ 发音显示

### 3. 智能复习
- ✅ 基于 FSRS 算法的间隔重复
- ✅ 智能优先级排序
- ✅ 自动补充机制
- ✅ 5级评分系统（不记得/模糊/一般/记得/完全记住）

### 4. 学习统计
- ✅ 待复习数量
- ✅ 今日已完成数量
- ✅ 总体掌握率
- ✅ 单词详情统计（稳定性、难度、复习次数）

### 5. 掌握程度
- ✅ 三级掌握等级（低/中/高）
- ✅ 基于稳定度的动态计算
- ✅ 可视化标识

## 🎨 UI/UX 设计

### 颜色方案

| 颜色 | 用途 | 值 |
|------|------|-----|
| 主色调 | 按钮高亮 | #4CAF50 (绿色) |
| 文字主色 | 主要文字 | #333 |
| 文字次色 | 次要文字 | #666 |
| 文字辅助 | 辅助文字 | #999 |
| 背景主色 | 页面背景 | #F5F5F5 |
| 背景次色 | 卡片背景 | #FFFFFF |
| 边框颜色 | 分隔线 | #E0E0E0 |

### 掌握等级颜色

| 等级 | 颜色 | 背景 |
|------|------|------|
| 低掌握 | 红色 | #ffebee |
| 中掌握 | 橙色 | #fff3e0 |
| 高掌握 | 绿色 | #e8f5e9 |

## 🔧 技术实现

### 1. 数据存储

使用 **SQLite** 本地数据库：

```javascript
// 打开数据库
const db = plus.sqlite.openDatabase({
  name: 'wordreview.db',
  path: '_doc/wordreview.db'
})

// 执行查询
const words = db.executeSql('SELECT * FROM words')

// 关闭数据库
db.close()
```

### 2. FSRS 算法

核心算法实现（在 `detail.vue` 和 `review.vue` 中）：

```javascript
calculateFSRS(rating, word) {
  const stability = word.stability || 0
  const difficulty = word.difficulty || 5

  // 计算新的难度
  const newDifficulty = Math.max(1, Math.min(10, difficulty - 0.4 * (rating - 2.5)))

  // 根据稳定性分段计算
  let newStability
  if (stability < 1.0) {
    // 初始期（0-1天）
    newStability = stability + 0.3 * (rating - 2.5)
  } else if (stability < 7.0) {
    // 成长期（1-7天）
    newStability = stability * (1 + 0.1 * (rating - 2.5))
  } else if (stability < 30.0) {
    // 稳定期（7-30天）
    newStability = stability * (1 + 0.05 * (rating - 2.5))
  } else {
    // 巩固期（30天以上）
    newStability = stability * (1 + 0.02 * (rating - 2.5))
  }

  newStability = Math.max(0.1, newStability)

  // 计算间隔（小时精度）
  const interval = Math.round(newStability * 24)

  return {
    stability: newStability,
    difficulty: newDifficulty,
    interval: interval,
    masteryLevel: masteryLevel
  }
}
```

### 3. 智能复习队列

```javascript
// 按紧急程度排序
const words = db.executeSql(
  `SELECT * FROM words
   WHERE next_review_date <= ? AND mastery_level != 'high'
   ORDER BY
     CASE
       WHEN next_review_date < ? THEN 0
       ELSE 1
     END,
     stability ASC,
     difficulty DESC
   LIMIT 20`
)
```

## 📝 使用步骤

### 1. 导入项目到 HBuilderX

```
1. 打开 HBuilderX
2. 文件 → 导入 → 从本地目录导入
3. 选择 D:\Projects\word-review-hbuilderx
4. 点击确定
```

### 2. 安装依赖

```bash
cd D:\Projects\word-review-hbuilderx
npm install
```

### 3. 配置签名

```
1. 右键项目 → 发行 → 原生App-云打包
2. 配置签名信息（或使用云端证书）
3. 填写应用信息
4. 点击打包
```

### 4. 安装 APK

```
1. 打包完成后下载 APK
2. 传输到手机
3. 允许安装未知来源
4. 点击安装
```

## ⚠️ 注意事项

### 1. 应用签名

- **务必妥善保管签名文件**
- **记住证书密码和私钥密码**
- **备份签名文件到安全位置**
- **丢失签名文件 = 无法更新应用**

### 2. 应用包名

建议修改为有意义的包名：

编辑 `manifest.json`：
```json
{
  "appid": "com.yourcompany.wordreview"
}
```

### 3. 图标文件

需要添加 Tab Bar 图标：

- `static/icon-word.png` (未选中)
- `static/icon-word-active.png` (选中)
- `static/icon-review.png` (未选中)
- `static/icon-review-active.png` (选中)

尺寸：81x81px（3倍图）或 54x54px（2倍图）

### 4. 网络依赖

- HBuilderX 云打包需要网络
- 如果网络不稳定，可以使用本地打包
- 或者在网络好的时候打包

## 🆚 两个版本的对比

### 优点对比

**React Native 版本：**
- ✅ 跨平台（Android + iOS + Web）
- ✅ 使用标准 React 生态
- ✅ 社区资源丰富
- ✅ 更灵活的定制能力

**HBuilderX 版本：**
- ✅ 开发效率高
- ✅ 打包简单（无需配置复杂环境）
- ✅ 学习曲线平缓
- ✅ 一站式开发环境
- ✅ 国内文档完善

### 缺点对比

**React Native 版本：**
- ❌ 网络要求高（Gradle 依赖下载）
- ❌ 配置复杂（Android SDK、签名等）
- ❌ 学习曲线陡峭

**HBuilderX 版本：**
- ❌ 跨平台能力较弱
- ❌ 灵活性较低
- ❌ 社区资源相对较少

## 🎯 推荐使用场景

### 使用 React Native 版本

- 需要跨多个平台（Android + iOS）
- 团队熟悉 React 生态
- 需要高度定制化
- 网络环境稳定

### 使用 HBuilderX 版本

- 只需要 Android 平台
- 快速开发和打包
- 学习成本较低
- 网络环境不稳定

## 📞 常见问题

### Q: 两个版本可以同时使用吗？

A: 不建议。两个版本使用不同的数据库，数据不互通。建议选择一个版本使用。

### Q: 如何选择版本？

A:
- 如果你的网络稳定，熟悉 React：选择 React Native 版本
- 如果你想要快速打包，不想配置复杂环境：选择 HBuilderX 版本

### Q: HBuilderX 版本的数据会丢失吗？

A: 不会。数据存储在手机本地 SQLite 数据库中，重新安装应用后数据会丢失，但升级应用时数据会保留。

### Q: 可以将 React Native 版本的数据迁移到 HBuilderX 版本吗？

A: 可以。需要导出 React Native 版本的数据，然后导入到 HBuilderX 版本的 SQLite 数据库中。

## 🎉 总结

HBuilderX 版本的单词记忆应用：

- ✅ **易于使用**: 直接在 HBuilderX 中打包
- ✅ **配置简单**: 无需 Gradle、Android SDK 等
- ✅ **功能完整**: 包含所有核心功能
- ✅ **算法先进**: 使用 FSRS 智能复习算法
- ✅ **界面美观**: 现代化的 UI 设计
- ✅ **适合国内用户**: 网络要求低，文档完善

**现在你有了两个版本的单词记忆应用，可以根据你的需求选择使用！** 🚀
