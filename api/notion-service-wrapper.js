/**
 * @file notion-service.js
 * @description Notion API服务（兼容层）
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-15
 */

// 从新的位置导入服务
const { notionService } = require('./services/notion-service');

// 重新导出服务以保持兼容性
module.exports = { notionService }; 