#!/bin/bash

# Expo 项目 Gradle 仓库修复脚本
# 用于修复 Android Studio 打包时的 Maven 仓库配置问题

set -e

echo "🔧 开始修复 Gradle 仓库配置..."

# 检查是否在 client 目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在 client 目录下运行此脚本"
    exit 1
fi

# 检查是否已执行 prebuild
if [ ! -d "android" ]; then
    echo "📦 正在执行 Expo Prebuild..."
    npx expo prebuild --clean
fi

echo "✅ Android 项目已生成"

# 备份原文件
if [ -f "android/settings.gradle" ]; then
    cp android/settings.gradle android/settings.gradle.backup
    echo "✅ 已备份 settings.gradle"
fi

# 检查并修复 settings.gradle
SETTINGS_FILE="android/settings.gradle"
if [ -f "$SETTINGS_FILE" ]; then
    echo "🔧 检查 settings.gradle 中的仓库配置..."

    # 检查是否包含本地 node_modules 仓库
    if ! grep -q "node_modules/react-native/android" "$SETTINGS_FILE"; then
        echo "⚠️  添加本地 node_modules Maven 仓库配置..."

        # 在 dependencyResolutionManagement.repositories 中添加本地仓库
        sed -i '/repositories {/a\
        // Expo 本地 Maven 仓库\
        maven {\
            url new File(["node", "--print", "require.resolve('"'"'react-native/package.json'"'"')"].execute(null, rootDir).text.trim(), "../android").toString()\
        }\
        maven {\
            url new File(["node", "--print", "require.resolve('"'"'expo/package.json'"'"')"].execute(null, rootDir).text.trim(), "../android").toString()\
        }
        ' "$SETTINGS_FILE"
    fi

    echo "✅ settings.gradle 仓库配置已修复"
fi

# 检查并修复 build.gradle
BUILD_FILE="android/build.gradle"
if [ -f "$BUILD_FILE" ]; then
    echo "🔧 检查 build.gradle 中的仓库配置..."

    # 确保 allprojects.repositories 包含本地仓库
    if ! grep -q "node_modules/react-native/android" "$BUILD_FILE"; then
        echo "⚠️  添加本地 node_modules Maven 仓库到 allprojects..."

        # 在 allprojects.repositories 中添加本地仓库
        sed -i '/allprojects {/,/}/ {
            /repositories {/a\
            maven { url "\$rootDir/../node_modules/react-native/android" }\
            maven { url "\$rootDir/../node_modules/expo/android/maven" }
        }' "$BUILD_FILE"
    fi

    echo "✅ build.gradle 仓库配置已修复"
fi

# 清理 Gradle 缓存
echo "🧹 清理 Gradle 缓存..."
cd android
./gradlew clean
cd ..

echo ""
echo "✅ 修复完成！"
echo ""
echo "下一步操作："
echo "1. 在 Android Studio 中打开 android 目录"
echo "2. 点击 File → Sync Project with Gradle Files"
echo "3. 等待同步完成后，点击 Build → Build Bundle(s) / APK(s) → Build APK(s)"
echo ""
echo "或者使用 EAS Build（推荐）："
echo "  eas build -p android --profile preview"
