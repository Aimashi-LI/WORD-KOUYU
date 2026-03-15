#!/bin/bash

# 本地构建 APK 脚本
# 使用说明：chmod +x build-local-apk.sh && ./build-local-apk.sh

set -e  # 遇到错误立即退出

echo "🚀 开始构建 Android APK..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

# 进入 client 目录
cd "$(dirname "$0")/client"

echo "📦 安装依赖..."
npm install

echo "🔧 配置 EAS..."
# 确保 eas.json 存在
cat eas.json || cat > eas.json << 'EOF'
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
EOF

# 检查 EAS CLI 是否安装
if ! command -v eas &> /dev/null; then
    echo "📦 安装 EAS CLI..."
    npm install -g eas-cli
fi

# 配置 EAS 项目
echo "🔧 初始化 EAS 项目..."
eas build:configure || true

# 构建 APK
echo "🏗️ 开始构建 APK..."
eas build --platform android --profile preview --non-interactive --local --output ./app-release.apk

# 查找生成的 APK 文件
echo "📤 查找生成的 APK 文件..."
APK_FILE=$(find . -name "*.apk" -type f | head -n 1)

if [ -n "$APK_FILE" ]; then
    echo "✅ APK 构建成功: $APK_FILE"
    cp "$APK_FILE" ./app-release.apk
    echo "📱 APK 文件已复制到: ./app-release.apk"
else
    echo "❌ APK 构建失败，未找到 APK 文件"
    exit 1
fi

echo "🎉 构建完成！"
