# 静态资源目录

此目录用于存放应用的静态资源文件。

## 📁 需要添加的图标文件

为了完整显示 Tab Bar 图标，请添加以下图标文件：

### Tab Bar 图标

| 文件名 | 说明 | 尺寸 |
|--------|------|------|
| icon-word.png | 单词列表图标（未选中） | 81x81px |
| icon-word-active.png | 单词列表图标（选中） | 81x81px |
| icon-review.png | 智能复习图标（未选中） | 81x81px |
| icon-review-active.png | 智能复习图标（选中） | 81x81px |

### 图标要求

- **格式**: PNG
- **尺寸**: 81x81px (3倍图) 或 54x54px (2倍图)
- **背景**: 透明
- **颜色**:
  - 未选中: #7A7E83 (灰色)
  - 选中: #3cc51f (绿色，可在 pages.json 中修改)

## 🎨 如何获取图标

### 方法 1：使用在线图标库

推荐使用以下图标库：
- [Iconfont](https://www.iconfont.cn/)
- [Flaticon](https://www.flaticon.com/)
- [IconPark](https://iconpark.oceanengine.com/)

搜索关键词：
- 单词列表: "word", "book", "list"
- 复习: "review", "refresh", "learning"

### 方法 2：自己绘制

使用以下工具：
- Photoshop
- Figma
- Sketch
- 在线编辑器（如 Canva）

### 方法 3：使用图标生成工具

- [IconKitchen](https://icon.kitchen/)
- [MakeAppIcon](https://makeappicon.com/)

## 📝 添加图标后的操作

1. 将图标文件放入 `static/` 目录
2. 在 HBuilderX 中重新编译项目
3. Tab Bar 图标就会正常显示

## 🚨 临时解决方案

如果暂时没有图标文件，可以：

### 方案 1：使用 emoji 作为图标（不推荐）

编辑 `pages.json`，将 `iconPath` 改为使用文字。

### 方案 2：先不配置图标

编辑 `pages.json`，移除 `tabBar` 配置中的 `iconPath` 和 `selectedIconPath`。

应用仍然可以正常使用，只是 Tab Bar 没有图标。

## 💡 建议

为了保证应用的美观和用户体验，**强烈建议添加这些图标文件**。
