#!/bin/bash

# Android APK Docker 构建脚本

set -e

echo "🔧 开始构建 Android APK..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker Desktop"
    exit 1
fi

# 构建 Docker 镜像
echo "📦 构建 Docker 镜像..."
docker build -f Dockerfile.android -t expo-android-builder .

# 清理旧的构建
echo "🧹 清理旧的构建..."
docker run --rm -v "$(pwd)/client":/workspace/client \
  expo-android-builder \
  bash -c "
    if [ -d android ]; then
      rm -rf android
    fi
    if [ -d node_modules ]; then
      rm -rf node_modules
    fi
  "

# 安装依赖
echo "📥 安装依赖..."
docker run --rm -v "$(pwd)/client":/workspace/client \
  expo-android-builder \
  npm install

# 生成 Android 项目
echo "🔨 生成 Android 项目..."
docker run --rm -v "$(pwd)/client":/workspace/client \
  expo-android-builder \
  npx expo prebuild --clean

# 构建 APK
echo "🏗️  构建 APK..."
docker run --rm -v "$(pwd)/client":/workspace/client \
  expo-android-builder \
  bash -c "
    cd android &&
    ./gradlew assembleDebug
  "

# 检查 APK 是否生成
APK_PATH="client/android/app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_PATH" ]; then
    echo "✅ APK 构建成功！"
    echo "📦 APK 位置: $APK_PATH"
    echo ""
    echo "📲 安装到设备："
    echo "   adb install $APK_PATH"
else
    echo "❌ APK 构建失败"
    exit 1
fi
