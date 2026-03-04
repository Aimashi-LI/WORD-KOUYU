# 单词记忆 - 网页版

这是单词记忆应用的网页版，使用 **React + TypeScript + Vite** 开发，完美复刻了移动端的所有功能和样式。

## 🎯 功能特性

### 单词管理
- ✅ 添加、查看、删除单词
- ✅ 搜索单词（支持单词和含义搜索）
- ✅ 按不同方式排序（复习时间、掌握程度、复习次数）
- ✅ 单词拆分（点击字母拆分记忆）
- ✅ 助记句（自定义助记句子）
- ✅ 例句展示

### 智能复习
- ✅ 基于 FSRS 算法的间隔重复
- ✅ 智能优先级排序
- ✅ 5级评分系统（不记得/模糊/一般/记得/完全记住）
- ✅ 自动补充机制

### 学习统计
- ✅ 待复习数量
- ✅ 今日已完成数量
- ✅ 总体掌握率
- ✅ 单词详情统计（稳定性、难度、复习次数）

### 数据管理
- ✅ 本地存储（localStorage）
- ✅ 数据导出（JSON 格式）
- ✅ 数据导入
- ✅ 清空所有数据

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000` 即可使用。

### 构建生产版本

```bash
npm run build
```

构建后的文件在 `dist` 目录。

### 预览生产版本

```bash
npm run preview
```

## 📁 项目结构

```
word-review-web/
├── src/
│   ├── pages/           # 页面组件
│   │   ├── Home.tsx     # 首页（单词列表）
│   │   ├── Detail.tsx   # 详情页
│   │   ├── Review.tsx   # 复习页
│   │   └── Profile.tsx  # 个人中心
│   ├── types/           # 类型定义
│   │   └── index.ts
│   ├── utils/           # 工具函数
│   │   ├── fsrs.ts      # FSRS 算法
│   │   ├── date.ts      # 日期处理
│   │   ├── storage.ts   # 数据存储
│   │   └── index.ts
│   ├── App.tsx          # 应用入口
│   ├── main.tsx         # 主入口
│   ├── App.css          # 应用样式
│   └── index.css        # 全局样式
├── index.html           # HTML 模板
├── package.json         # 依赖配置
├── tsconfig.json        # TypeScript 配置
├── vite.config.ts       # Vite 配置
└── README.md            # 项目说明
```

## 🎨 技术栈

- **框架**: React 18
- **语言**: TypeScript
- **构建工具**: Vite
- **路由**: React Router DOM
- **样式**: CSS (CSS Variables)
- **数据存储**: localStorage
- **算法**: FSRS (Free Spaced Repetition Scheduler)

## 📱 与移动版对比

| 特性 | 移动版 (React Native) | 网页版 (React) |
|------|---------------------|----------------|
| **技术栈** | React Native + Expo | React + Vite |
| **数据存储** | SQLite | localStorage |
| **打包方式** | Gradle | Vite Build |
| **路由** | Expo Router | React Router |
| **样式** | StyleSheet | CSS |
| **功能** | 完整 | 完整 |
| **UI 风格** | 一致 | 一致 |

## 🔧 FSRS 算法说明

使用 **Free Spaced Repetition Scheduler (FSRS)** 算法实现智能间隔重复：

### 四阶段稳定性增长

1. **初始期（0-1天）**: 快速增长
   - `newStability = stability + 0.3 * (rating - 2.5)`

2. **成长期（1-7天）**: 稳步提升
   - `newStability = stability * (1 + 0.1 * (rating - 2.5))`

3. **稳定期（7-30天）**: 平缓增长
   - `newStability = stability * (1 + 0.05 * (rating - 2.5))`

4. **巩固期（30天+）**: 缓慢巩固
   - `newStability = stability * (1 + 0.02 * (rating - 2.5))`

### 掌握程度计算

基于稳定性分为三个等级：

- **低掌握**: 稳定性 < 2天
- **中掌握**: 稳定性 2-10天
- **高掌握**: 稳定性 > 10天

### 间隔计算

使用小时级精度：
```typescript
const interval = Math.round(newStability * 24); // 转换为小时
```

## 💡 使用说明

### 添加单词

1. 点击首页底部的 **"+ 添加单词"** 按钮
2. 填写单词和含义（必填）
3. 可选填写发音、例句、拆分、助记句
4. 点击 **保存**

### 开始复习

1. 点击首页的 **"开始复习"** 按钮
2. 查看单词正面，点击 **"查看答案"**
3. 根据记忆程度选择评分：
   - **不记得** (0): 稳定性降低，快速复习
   - **模糊** (2): 稳定性微降
   - **一般** (3): 稳定性保持
   - **记得** (4): 稳定性提升
   - **完全记住** (5): 稳定性大幅提升

### 数据管理

1. 进入 **个人中心**
2. 点击 **"导出数据"** 下载 JSON 文件
3. 点击 **"导入数据"** 上传 JSON 文件恢复数据
4. 点击 **"清空所有数据"** 删除所有单词（谨慎使用）

## 🎯 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 📝 开发说明

### 添加新功能

1. 在 `src/pages/` 添加新页面
2. 在 `src/App.tsx` 添加路由
3. 在 `src/utils/` 添加工具函数
4. 在 `src/types/` 添加类型定义

### 修改样式

所有样式使用 CSS 变量，在 `src/index.css` 中定义：

```css
:root {
  --primary-color: #4CAF50;
  --text-primary: #333;
  /* ... 更多变量 */
}
```

### 添加新类型

在 `src/types/index.ts` 中添加：

```typescript
export interface YourType {
  id: number;
  name: string;
}
```

## 🆚 三个版本对比

| 版本 | 路径 | 技术栈 | 优势 |
|------|------|--------|------|
| **移动版** | `D:\Projects\word-review\client\` | React Native | 跨平台、原生体验 |
| **HBuilderX 版** | `D:\Projects\word-review-hbuilderx\` | uni-app | 易于打包、学习成本低 |
| **网页版** | `D:\Projects\word-review-web\` | React + Vite | 无需安装、易分享 |

## 📞 常见问题

### Q: 数据会丢失吗？

A: 数据存储在浏览器的 localStorage 中，只要不清理浏览器数据，数据会一直保留。建议定期导出备份。

### Q: 可以同步数据吗？

A: 目前不支持云端同步，但可以通过导出/导入功能在不同设备间转移数据。

### Q: 支持哪些浏览器？

A: 支持所有现代浏览器（Chrome、Firefox、Safari、Edge）。

### Q: 如何清空数据？

A: 进入个人中心，点击 **"清空所有数据"** 按钮。此操作不可恢复，请谨慎使用。

## 🎉 总结

网页版单词记忆应用：

- ✅ **功能完整**: 包含所有核心功能
- ✅ **样式一致**: 与移动版 UI 风格保持一致
- ✅ **无需安装**: 直接在浏览器中使用
- ✅ **易于分享**: 可通过链接分享给他人
- ✅ **算法先进**: 使用 FSRS 智能复习算法
- ✅ **数据安全**: 支持导出备份

**现在就可以在浏览器中使用了！** 🚀
