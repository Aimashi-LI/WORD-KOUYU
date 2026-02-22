// OCR 环境检测工具
// 用于检测当前环境是否支持 react-native-tesseract-ocr

import { Platform, NativeModules } from 'react-native';

export interface OCREnvironmentInfo {
  supported: boolean;
  platform: string;
  hasNativeModule: boolean;
  isExpoGo: boolean;
  message: string;
  instructions?: string;
}

/**
 * 检测当前环境是否支持 OCR
 */
export function checkOCREnvironment(): OCREnvironmentInfo {
  const platform = Platform.OS;
  const TesseractOcr = NativeModules.TesseractOcr;
  const hasNativeModule = !!TesseractOcr;
  
  // 检测是否在 Expo Go 中
  const isExpoGo = (NativeModules.ExponentConstants as any)?.appOwnership === 'expo' ||
                     (NativeModules.ExponentConstants as any)?.__EXPO_DEV_SERVER_LAUNCHER;

  if (isExpoGo) {
    return {
      supported: false,
      platform,
      hasNativeModule: false,
      isExpoGo: true,
      message: '⚠️ 当前使用的是 Expo Go，不支持原生 OCR 模块',
      instructions: `
请按照以下步骤构建开发版本：

方案 1：使用 EAS Build（推荐）
----------------------------------
1. 安装 EAS CLI：
   npm install -g eas-cli

2. 登录 Expo：
   eas login

3. 配置项目：
   cd /workspace/projects/client
   eas build:configure

4. 构建开发版本：
   eas build --platform android --profile development

5. 下载并安装 APK

方案 2：本地构建
----------------------------------
1. 生成原生项目：
   cd /workspace/projects/client
   npx expo prebuild --platform android --clean

2. 构建并安装：
   npx expo run:android

构建完成后，OCR 功能即可正常使用。
      `.trim(),
    };
  }

  if (!hasNativeModule) {
    return {
      supported: false,
      platform,
      hasNativeModule: false,
      isExpoGo: false,
      message: '⚠️ 未检测到 react-native-tesseract-ocr 原生模块',
      instructions: `
请确保已正确配置开发构建：

1. 检查是否已安装依赖：
   cd /workspace/projects/client
   pnpm install

2. 重新生成原生项目：
   npx expo prebuild --platform android --clean

3. 重新构建：
   npx expo run:android
      `.trim(),
    };
  }

  return {
    supported: true,
    platform,
    hasNativeModule: true,
    isExpoGo: false,
    message: '✅ 当前环境支持 OCR 识别',
  };
}

/**
 * 在控制台输出环境信息
 */
export function logOCREnvironment() {
  const env = checkOCREnvironment();
  
  console.log('\n========================================');
  console.log('OCR 环境检测结果');
  console.log('========================================');
  console.log(`平台: ${env.platform}`);
  console.log(`原生模块: ${env.hasNativeModule ? '✅ 已加载' : '❌ 未加载'}`);
  console.log(`Expo Go: ${env.isExpoGo ? '是' : '否'}`);
  console.log(`支持 OCR: ${env.supported ? '✅ 是' : '❌ 否'}`);
  console.log(`\n${env.message}`);
  if (env.instructions) {
    console.log(`\n${env.instructions}`);
  }
  console.log('========================================\n');
  
  return env;
}
