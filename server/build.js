import * as esbuild from 'esbuild';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');
const dependencies = pkg.dependencies || {};
const externalList = Object.keys(dependencies).filter(dep => dep !== 'dayjs');

// 额外排除前端相关依赖
const frontendDeps = [
  'react', 'react-native', 'expo', 'expo-*', '@expo/*',
  '@react-native/*', 'react-native-*', '@react-navigation/*'
];
externalList.push(...frontendDeps);

try {
  await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outdir: 'dist',
    external: externalList,
  });
  console.log('⚡ Build complete!');
} catch (e) {
  console.error(e);
  process.exit(1);
}
