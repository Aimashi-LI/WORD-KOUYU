# 法律文档使用说明

本目录包含"编码记忆法"应用的所有法律文档。

## 文档列表

1. **隐私政策** (`privacy-policy.md`)
   - 说明数据收集、使用和保护方式
   - 强调应用完全离线，不上传数据

2. **用户协议** (`terms-of-service.md`)
   - 规范用户使用应用的权利和义务
   - 包含知识产权、免责声明等内容

3. **应用权限说明** (`permissions.md`)
   - 详细说明应用请求的各项权限及其用途
   - 强调遵循"最小权限原则"

## 使用方式

### 方式一：应用内展示（当前实现）

法律文档内容已内嵌在应用中，通过"关于"页面查看。

**优点**：
- 无需网络即可查看
- 更好的用户体验

**实现**：
- 文档内容存储在 `client/screens/about/index.tsx` 中
- 点击法律文档链接会弹出 Modal 展示完整内容
- 支持滚动查看长文档

### 方式二：在线文档（可选）

如果需要在线展示，请按以下步骤操作：

1. 将这三个 Markdown 文件转换为 HTML 或直接在文档平台发布
2. 更新应用中的链接（在 `client/screens/about/index.tsx` 中）：

```typescript
const LEGAL_DOCS = {
  privacyPolicy: 'https://your-domain.com/privacy',
  termsOfService: 'https://your-domain.com/terms',
  permissions: 'https://your-domain.com/permissions',
};
```

3. 修改 `handleOpenLink` 函数来处理链接跳转

## 应用商店审核

发布到应用商店时，通常需要提供以下信息：

### Google Play

- **隐私政策 URL**：必需，必须在应用描述中提供
- **权限声明**：必须说明为何需要某些权限
- **数据安全声明**：说明数据收集和使用情况

### Apple App Store

- **隐私政策 URL**：必需
- **权限使用说明**：在 App Store Connect 中填写
- **数据收集声明**：声明是否收集用户数据

## 自定义建议

### 1. 替换联系信息

在所有文档中，替换以下占位符：

- `2487717060@qq.com` → 您的实际邮箱（如已更新）
- `小浣熊` → 您的实际开发者名称或公司名称（如已更新）

### 2. 更新版本号

在每个文档底部的"版本号"和"发布日期"中，根据实际情况更新。

### 3. 法律咨询

如果您打算正式发布应用，建议：

- 咨询专业律师，确保文档符合当地法律法规
- 根据应用功能调整文档内容
- 定期更新文档（至少每年一次）

## 常见问题

### Q: 为什么需要这些文档？

**A**:
- 应用商店审核要求
- 用户信任和透明度
- 法律合规（如 GDPR、CCPA 等）

### Q: 我可以直接使用这些模板吗？

**A**: 可以，但建议：
- 根据实际情况修改内容
- 替换所有占位符
- 咨询法律专业人士（推荐）

### Q: 应用完全离线，还需要隐私政策吗？

**A**: 需要。即使应用不收集数据，仍需要：
- 说明应用如何处理数据
- 告知用户数据存储位置（本地）
- 符合应用商店审核要求

### Q: 如何更新法律文档？

**A**:
1. 修改 Markdown 文件（docs/legal/ 目录）
2. 修改应用内展示内容（client/screens/about/index.tsx）
3. 更新应用版本号和发布日期
4. 重新发布应用

## 参考资源

- [Google Play 隐私政策要求](https://support.google.com/googleplay/android-developer/answer/9858076)
- [Apple App Store 隐私政策要求](https://developer.apple.com/app-store/review/guidelines/#privacy)
- [中国网络安全法](https://www.gov.cn/flfg/2016-11/07/content_5129704.htm)

## 支持

如有疑问，请通过以下方式联系：

- 邮箱：2487717060@qq.com
- 应用内"关于"页面 → "发送邮件"

---

**最后更新**：2025年1月
