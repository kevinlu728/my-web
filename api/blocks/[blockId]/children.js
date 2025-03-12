/**
 * @file children.js
 * @description 块子块API端点
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

const { notionService } = require('../../notion-service.js');

module.exports = async function handler(req, res) {
  // 获取请求来源
  const origin = req.headers.origin || '*';
  
  // 记录请求信息
  console.log(`API请求: ${req.method} ${req.url}`);
  // 简化请求头日志
  console.log('请求来源:', req.headers.origin || '未知', '来源页面:', req.headers.referer || '未知');
  
  // 设置CORS头，允许所有来源访问
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24小时

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    console.log('处理OPTIONS预检请求');
    res.status(200).end();
    return;
  }

  // 只允许GET请求
  if (req.method !== 'GET') {
    console.error(`不支持的请求方法: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { blockId } = req.query;
    console.log(`获取块的子块数据，块ID: ${blockId}`);
    
    if (!blockId) {
      console.error('缺少blockId参数');
      return res.status(400).json({ error: '缺少blockId参数' });
    }
    
    // 增加缓存控制头，防止浏览器缓存
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // 记录请求详情以便调试
    console.log('开始Notion API调用:', {
      blockId,
      apiKeyAvailable: !!process.env.NOTION_API_KEY,
      apiKeyPrefix: process.env.NOTION_API_KEY ? 
        `${process.env.NOTION_API_KEY.substring(0, 4)}...` : 
        '未设置',
      timestamp: new Date().toISOString()
    });
    
    try {
      // 获取查询参数
      const data = await notionService.getBlockChildren(blockId);
      
      if (!data) {
        console.error(`获取块数据失败，返回为空: ${blockId}`);
        return res.status(500).json({ 
          error: '获取数据失败',
          message: 'Notion API返回空数据',
          blockId: blockId
        });
      }
      
      console.log(`成功获取块数据: ${blockId}, 子块数量: ${data.results ? data.results.length : 0}`);
      
      // 确保返回的数据有results字段，即使为空
      if (!data.results) {
        console.warn(`Notion API返回数据缺少results字段: ${blockId}`);
        data.results = [];
      }
      
      return res.status(200).json(data);
    } catch (error) {
      // 简化错误日志，保留关键信息
      console.error(`获取数据错误: ${blockId}, ${error.message}`, {
        errorName: error.name,
        code: error.code || 'unknown',
        status: error.status || 'unknown'
      });
      
      // 根据错误类型返回不同的状态码
      let statusCode = 500;
      let errorMessage = 'Notion API调用失败';
      
      if (error.status) {
        statusCode = error.status;
      }
      
      if (error.code === 'unauthorized') {
        statusCode = 401;
        errorMessage = 'API密钥未授权';
      } else if (error.code === 'not_found') {
        statusCode = 404;
        errorMessage = '未找到指定的块';
      } else if (error.code === 'rate_limited') {
        statusCode = 429;
        errorMessage = 'API请求次数超出限制';
      } else if (error.code === 'validation_error') {
        statusCode = 400;
        errorMessage = '请求参数有误';
      }
      
      // 返回一个友好的错误响应，而不是抛出错误
      console.error('返回500错误响应');
      return res.status(statusCode).json({ 
        error: errorMessage,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } catch (error) {
    console.error('API请求处理失败:', error.message, {
      url: req.url,
      method: req.method
    });
    
    // 确保只返回一次响应
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: '获取块的子块数据失败', 
        message: error.message
      });
    }
  }
} 