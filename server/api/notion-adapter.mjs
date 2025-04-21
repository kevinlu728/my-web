/**
 * @file notion-adapter.mjs
 * @description ES模块适配器，用于在server/api中重用api目录中的代码
 * @author 陆凯
 * @created 2024-03-15
 * @updated 2024-03-16
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 创建require函数
const require = createRequire(import.meta.url);

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../../');

// 确保环境变量在模块中可用
console.log('🔄 适配器加载环境变量检查:');
console.log(`NOTION_API_KEY: ${process.env.NOTION_API_KEY ? '已设置' : '未设置'}`);
console.log(`NOTION_DATABASE_ID: ${process.env.NOTION_DATABASE_ID ? '已设置' : '未设置'}`);

// 如果在ES模块中环境变量不可用，这里添加一个备用方案
if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: resolve(rootDir, '.env') });
    console.log('📝 从.env文件加载环境变量');
  } catch (err) {
    console.warn('⚠️ 无法加载dotenv，环境变量可能不可用');
  }
}

// 导入api目录中的配置
const { notionConfig } = require(resolve(rootDir, 'api/config/notion-config'));

// 创建显式配置，不依赖环境变量的自动注入
const explicitConfig = {
  apiKey: process.env.NOTION_API_KEY,
  apiVersion: notionConfig.apiVersion || '2022-06-28',
  defaultDatabaseId: process.env.NOTION_DATABASE_ID,
  defaultBlogDatabaseId: process.env.NOTION_DATABASE_BLOGARTICALS_ID,
  defaultLifeDatabaseId: process.env.NOTION_DATABASE_LIFEPHOTOS_ID
};

// 导入api目录中的服务
const notionServiceModule = require(resolve(rootDir, 'api/services/notion-service'));
const notionService = notionServiceModule.notionService;

// 直接注入配置，确保服务能访问到正确的值
if (notionService && notionService.config) {
  notionService.config.apiKey = explicitConfig.apiKey;
  notionService.config.defaultDatabaseId = explicitConfig.defaultDatabaseId;
  notionService.config.defaultBlogDatabaseId = explicitConfig.defaultBlogDatabaseId;
  notionService.config.defaultLifeDatabaseId = explicitConfig.defaultLifeDatabaseId;
  notionService.config.headers = {
    'Authorization': `Bearer ${explicitConfig.apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': explicitConfig.apiVersion
  };
  console.log('✅ 已注入API配置到notionService');
}

// 导入api目录中的工具
const response = require(resolve(rootDir, 'api/utils/response'));
const validation = require(resolve(rootDir, 'api/utils/validation'));
const cors = require(resolve(rootDir, 'api/utils/cors'));

// 导入api目录中的处理器
const articleHandlers = require(resolve(rootDir, 'api/internal/article-handlers'));
const photoHandlers = require(resolve(rootDir, 'api/internal/photo-handlers'));
const databaseHandlers = require(resolve(rootDir, 'api/internal/database-handlers'));
const contentHandlers = require(resolve(rootDir, 'api/internal/content-handlers'));
const systemHandlers = require(resolve(rootDir, 'api/internal/system-handlers'));
const helloHandlers = require(resolve(rootDir, 'api/internal/hello-handlers'));

// 适配所有导入，确保能在ES模块环境中使用
export {
  notionService,
  notionConfig,
  explicitConfig,
  response,
  validation,
  cors,
  articleHandlers,
  photoHandlers,
  databaseHandlers,
  contentHandlers,
  systemHandlers,
  helloHandlers
}; 