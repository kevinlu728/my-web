/**
 * @file notion-test.js
 * @description Notion API测试路由，用于验证与Notion API的连接是否正常
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

// Notion API 测试接口
// 使用 CommonJS 风格导入，兼容 Vercel 环境
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// 基础配置
const config = {
  notion: {
    apiKey: process.env.NOTION_API_KEY || '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',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY || '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'}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    }
  }
};

// 测试API连接
async function testConnection() {
  try {
    const response = await fetch('https://api.notion.com/v1/users/me', {
      method: 'GET',
      headers: config.notion.headers
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error testing Notion API:', error);
    throw error;
  }
}

// 导出处理函数
module.exports = async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只处理 GET 请求
  if (req.method === 'GET') {
    try {
      const data = await testConnection();
      res.status(200).json({
        message: 'Notion API connection successful',
        user: data
      });
    } catch (error) {
      console.error('Error testing Notion API:', error);
      res.status(500).json({ 
        error: 'Error testing Notion API', 
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 