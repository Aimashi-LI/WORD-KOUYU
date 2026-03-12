# 📱 APK 快速构建指南

## 🚀 最简单的方法：使用 Docker 构建

无需任何配置，Docker 会自动处理所有环境。

---

## 前置要求

1. **安装 Docker Desktop**
   - 下载：https://www.docker.com/products/docker-desktop/
   - 安装后启动 Docker Desktop
   - 确保 Docker 正在运行

2. **检查 Docker 是否运行**

   打开 CMD 或 PowerShell，执行：
   ```bash
   docker info
   ```

   如果显示信息，说明 Docker 正在运行。

---

## 📦 构建步骤

### Windows 用户

1. **打开 CMD 或 PowerShell**

2. **进入项目目录**

   ```bash
   cd D:\workspace\projects
   ```

3. **运行构建脚本**

   ```bash
   build-apk-docker.bat
   ```

4. **等待构建完成**

   首次构建需要下载 Docker 镜像，可能需要 10-20 分钟。
   后续构建会快很多（约 5-10 分钟）。

5. **获取 APK**

   构建成功后：
   - APK 自动打开所在目录
   - APK 位置：`D:\workspace\projects\client\android\app\build\outputs\apk\debug\app-debug.apk`

---

## 📲 安装到设备

### 方法一：USB 连接

1. Android 设备启用 USB 调试
   - 设置 → 关于手机 → 连续点击"版本号"7次
   - 返回 → 开发者选项 → 启用 USB 调试

2. 连接设备到电脑

3. 执行安装命令

   ```bash
   adb install D:\workspace\projects\client\android\app\build\outputs\apk\debug\app-debug.apk
   ```

### 方法二：直接传输

1. 将 APK 文件传输到 Android 设备（微信、QQ、数据线等）
2. 在设备上启用"未知来源"安装
   - 设置 → 安全 → 未知来源 → 允许
3. 点击 APK 文件安装

---

## 🔄 重新构建

修改代码后，重新构建：

```bash
cd D:\workspace\projects
build-apk-docker.bat
```

---

## ❓ 常见问题

### Q1: Docker 未运行

**错误信息**：`Docker 未运行，请先启动 Docker Desktop`

**解决方法**：
1. 启动 Docker Desktop
2. 等待 Docker 完全启动（托盘图标变为绿色）
3. 重新运行构建脚本

---

### Q2: 构建失败

**错误信息**：各种构建错误

**解决方法**：
1. 清理 Docker 缓存
   ```bash
   docker system prune -a
   ```
2. 重新运行构建脚本

---

### Q3: APK 安装失败

**错误信息**：`INSTALL_FAILED_UPDATE_INCOMPATIBLE`

**解决方法**：
1. 先卸载旧版本
   ```bash
   adb uninstall com.your.app.id
   ```
2. 重新安装

---

## 💡 提示

- **首次构建较慢**：需要下载 Docker 镜像和 Android SDK
- **后续构建较快**：使用缓存，只需 5-10 分钟
- **Docker 镜像大小**：约 3-5 GB
- **APK 文件大小**：约 30-50 MB

---

## 🎯 特点

✅ **零配置**：Docker 自动处理所有环境
✅ **跨平台**：Windows、Linux、Mac 通用
✅ **隔离环境**：不影响本地系统
✅ **可重复**：每次构建环境一致

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 Docker Desktop 日志
2. 检查错误信息
3. 重启 Docker Desktop
4. 清理 Docker 缓存

---

**祝您构建成功！🎉**
