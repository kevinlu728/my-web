/**
 * 简单部署测试脚本
 */

import { exec } from 'child_process';
import fs from 'fs';

console.log('开始部署测试...');

// 检查package.json
try {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  console.log('检查package.json配置:');
  console.log('- node-fetch版本:', packageJson.dependencies['node-fetch']);
  console.log('- whatwg-url版本:', packageJson.dependencies['whatwg-url']);
  console.log('- 有prebuild脚本?', !!packageJson.scripts.prebuild);
} catch (error) {
  console.error('检查package.json失败:', error.message);
}

// 检查vercel.json
try {
  const vercelJson = JSON.parse(fs.readFileSync('./vercel.json', 'utf8'));
  console.log('\n检查vercel.json配置:');
  console.log('- API构建源:', vercelJson.builds?.find(b => b.use === '@vercel/node')?.src);
  console.log('- 有buildCommand?', !!vercelJson.builds?.find(b => b.use === '@vercel/node')?.config?.buildCommand);
  console.log('- 有includeFiles?', !!vercelJson.builds?.find(b => b.use === '@vercel/node')?.config?.includeFiles);
} catch (error) {
  console.error('检查vercel.json失败:', error.message);
}

// 检查API文件
try {
  const apiRoutesContent = fs.readFileSync('./api/api-routes.js', 'utf8');
  console.log('\n检查api-routes.js:');
  console.log('- 引入whatwg-url?', apiRoutesContent.includes("require('whatwg-url')"));
  console.log('- 使用CommonJS导出?', apiRoutesContent.includes('module.exports'));
} catch (error) {
  console.error('检查api-routes.js失败:', error.message);
}

// 检查prebuild脚本
try {
  console.log('\n检查prebuild.js:');
  console.log('- prebuild.js存在?', fs.existsSync('./prebuild.js'));
} catch (error) {
  console.error('检查prebuild.js失败:', error.message);
}

console.log('\n配置检查完成，准备部署。');
console.log('如果配置正确，请执行: npm run deploy');