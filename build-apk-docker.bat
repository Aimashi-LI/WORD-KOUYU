@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🔧 开始构建 Android APK...

REM 检查 Docker 是否运行
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker 未运行，请先启动 Docker Desktop
    pause
    exit /b 1
)

REM 设置项目目录
set PROJECT_DIR=%~dp0
set PROJECT_DIR=%PROJECT_DIR:~0,-1%

echo 📦 项目目录: %PROJECT_DIR%
echo.

REM 构建 Docker 镜像
echo 📦 构建 Docker 镜像...
docker build -f Dockerfile.android -t expo-android-builder "%PROJECT_DIR%"
if errorlevel 1 (
    echo ❌ Docker 镜像构建失败
    pause
    exit /b 1
)

REM 清理旧的构建
echo 🧹 清理旧的构建...
docker run --rm -v "%PROJECT_DIR%\client":/workspace/client ^
  expo-android-builder ^
  bash -c "rm -rf android node_modules 2>/dev/null || true"

REM 安装依赖
echo 📥 安装依赖...
docker run --rm -v "%PROJECT_DIR%\client":/workspace/client ^
  expo-android-builder ^
  npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

REM 生成 Android 项目
echo 🔨 生成 Android 项目...
docker run --rm -v "%PROJECT_DIR%\client":/workspace/client ^
  expo-android-builder ^
  npx expo prebuild --clean
if errorlevel 1 (
    echo ❌ Android 项目生成失败
    pause
    exit /b 1
)

REM 构建 APK
echo 🏗️  构建 APK...
docker run --rm -v "%PROJECT_DIR%\client":/workspace/client ^
  expo-android-builder ^
  bash -c "cd android && ./gradlew assembleDebug"
if errorlevel 1 (
    echo ❌ APK 构建失败
    pause
    exit /b 1
)

REM 检查 APK 是否生成
set APK_PATH=%PROJECT_DIR%\client\android\app\build\outputs\apk\debug\app-debug.apk

if exist "%APK_PATH%" (
    echo.
    echo ✅ APK 构建成功！
    echo 📦 APK 位置: %APK_PATH%
    echo.
    echo 📲 安装到设备：
    echo    adb install "%APK_PATH%"
    echo.
    echo 按任意键打开 APK 所在目录...
    pause >nul
    explorer "%PROJECT_DIR%\client\android\app\build\outputs\apk\debug\"
) else (
    echo.
    echo ❌ APK 构建失败，未找到 APK 文件
    echo 预期位置: %APK_PATH%
    pause
    exit /b 1
)
