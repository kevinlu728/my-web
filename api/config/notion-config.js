/**
 * @file notion-config.js
 * @description Notion API配置模块和处理函数
 * @author 陆凯
 * @created 2024-04-02
 * @updated 2024-03-15
 */

// Notion API配置对象
const notionConfig = {
  // API版本
  apiVersion: '2022-06-28',
  
  // 获取API密钥
  getApiKey: () => process.env.NOTION_API_KEY,
  
  // 获取默认数据库ID
  getDefaultDatabaseId: () => process.env.NOTION_DATABASE_ID,

  // 获取博客数据库ID
  getDefaultBlogDatabaseId: () => process.env.NOTION_DATABASE_BLOGARTICALS_ID,

  // 获取生活数据库ID
  getDefaultLifeDatabaseId: () => process.env.NOTION_DATABASE_LIFEPHOTOS_ID,
  
  // 检查API密钥是否有效
  isApiKeyValid: () => {
    const apiKey = process.env.NOTION_API_KEY;
    return apiKey && apiKey.match(/^secret_[a-zA-Z0-9]{43}$/);
  },
  
  // 获取API密钥指纹（安全混淆版本）
  getApiKeyFingerprint: () => {
    const apiKey = process.env.NOTION_API_KEY || '';
    if (!apiKey) return null;
    
    const apiKeyPrefix = apiKey.substring(0, 4);
    const apiKeySuffix = apiKey.substring(apiKey.length - 4);
    return `${apiKeyPrefix}...${apiKeySuffix}`;
  },
  
  // API相关配置
  apiBasePath: '/api',
  directApiAllowed: false,
  
  // 缓存设置
  cacheDuration: 5 * 60 * 1000, // 5分钟缓存
  
  // 获取公开的配置对象（用于API响应）
  getPublicConfig: () => {
    return {
      version: notionConfig.apiVersion,
      hasKey: !!process.env.NOTION_API_KEY,
      keyFingerprint: notionConfig.getApiKeyFingerprint(),
      directApiAllowed: notionConfig.directApiAllowed,
      apiBasePath: notionConfig.apiBasePath,
      databaseId: notionConfig.getDefaultDatabaseId() || null,
      blogDatabaseId: notionConfig.getDefaultBlogDatabaseId() || null,
      lifeDatabaseId: notionConfig.getDefaultLifeDatabaseId() || null
    };
  }
};

// API处理函数（用于Vercel Serverless Function）
async function handler(req, res) {
  // 设置CORS头
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }
  
  // 检查API密钥
  if (!notionConfig.getApiKey()) {
    console.error('NOTION_API_KEY环境变量未设置');
    return res.status(500).json({ error: 'API配置错误' });
  }
  
  // 返回公开配置
  try {
    // 验证API密钥格式是否合法
    if (!notionConfig.isApiKeyValid()) {
      console.warn('API密钥格式可能不正确');
    }
    
    // 返回配置
    return res.status(200).json(notionConfig.getPublicConfig());
  } catch (error) {
    console.error('生成API配置时出错:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}

// 导出配置对象和处理函数
module.exports = {
  notionConfig,
  handler
};

// 保持兼容性，支持直接作为Vercel Serverless Function
module.exports.default = handler; 