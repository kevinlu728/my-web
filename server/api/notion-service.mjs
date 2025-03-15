/**
 * @file notion-service.mjs
 * @description Notion API服务封装（使用统一版本）
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-15
 */

// 导入API目录中的服务实现
import { notionService as apiNotionService } from './notion-adapter.mjs';

// 重新导出服务，并添加服务器特有的扩展
export const notionService = {
  ...apiNotionService,
  
  // 服务器特有的状态方法
  getStatus() {
    return {
      isConnected: Boolean(process.env.NOTION_API_KEY),
      apiVersion: apiNotionService.config?.headers?.['Notion-Version'] || '2022-06-28',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      databaseId: process.env.NOTION_DATABASE_ID ? `${process.env.NOTION_DATABASE_ID.substring(0,4)}...` : '未设置'
    };
  }
}; 