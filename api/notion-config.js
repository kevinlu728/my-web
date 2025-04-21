/**
 * @file notion-config.js
 * @description Notion API配置端点，仅提供有限的配置信息，不泄露完整密钥
 * @author 陆凯
 * @created 2024-04-02
 */

module.exports = async function handler(req, res) {
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
  if (!process.env.NOTION_API_KEY) {
    console.error('NOTION_API_KEY环境变量未设置');
    return res.status(500).json({ error: 'API配置错误' });
  }
  
  // 仅返回非敏感的配置信息
  try {
    // 对API密钥的前4位和后4位进行混淆处理，形成指纹
    const apiKey = process.env.NOTION_API_KEY;
    const apiKeyPrefix = apiKey.substring(0, 4);
    const apiKeySuffix = apiKey.substring(apiKey.length - 4);
    
    // 验证API密钥格式是否合法
    if (!apiKey.match(/^secret_[a-zA-Z0-9]{43}$/)) {
      console.warn('API密钥格式可能不正确');
    }
    
    // 构建配置响应
    const config = {
      version: '2022-06-28', // Notion API版本
      hasKey: true,
      keyFingerprint: `${apiKeyPrefix}...${apiKeySuffix}`,
      directApiAllowed: false, // 禁止客户端直接调用API
      apiBasePath: '/api',
      databaseId: process.env.NOTION_DATABASE_ID || null,
      blogDatabaseId: process.env.NOTION_DATABASE_BLOGARTICALS_ID || null,
      lifeDatabaseId: process.env.NOTION_DATABASE_LIFEPHOTOS_ID || null
    };
    
    // 返回配置
    return res.status(200).json(config);
  } catch (error) {
    console.error('生成API配置时出错:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
} 