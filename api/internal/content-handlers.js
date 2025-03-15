/**
 * @file content-handlers.js
 * @description 文章和块内容API的内部处理函数
 * @author 陆凯
 * @created 2024-03-15
 * @updated 2024-03-16
 */

const { notionService } = require('../services/notion-service');
const { formatResponse, handleError, logRequest } = require('../utils/response');
const { validateRequiredFields, validatePageId, validateBlockId } = require('../utils/validation');

/**
 * 获取文章内容
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<Object>} 响应对象
 */
async function getArticleContent(req, res) {
  logRequest(req, '获取文章内容');
  
  try {
    // 优先从路由参数获取pageId
    let pageId = req.params?.pageId;
    
    // 如果没有路由参数，尝试从查询参数获取
    if (!pageId) {
      pageId = req.query?.pageId;
    }
    
    console.log(`获取文章内容，页面ID: ${pageId || '未提供'}`);
    
    // 验证页面ID
    if (!pageId || !validatePageId(pageId)) {
      return formatResponse(res, {
        error: '无效的页面ID',
        message: '提供的页面ID格式不正确或缺失'
      }, 400);
    }
    
    const pageSize = parseInt(req.query.page_size) || 10;
    const cursor = req.query.cursor;

    // 确保Notion API密钥可用
    if (!process.env.NOTION_API_KEY && req.notionConfig && req.notionConfig.apiKey) {
      // 如果环境变量中没有，但请求对象中有，则临时设置
      process.env.NOTION_API_KEY = req.notionConfig.apiKey;
      console.log('已从请求对象中获取API密钥');
    }
    
    // 打印调试信息
    console.log(`正在获取文章内容, pageId: ${pageId}, pageSize: ${pageSize}, cursor: ${cursor || '无'}`);
    console.log(`API密钥状态: ${process.env.NOTION_API_KEY ? '已设置' : '未设置'}`);
    
    const data = await notionService.getPageContent(pageId, pageSize, cursor);
    
    if (!data) {
      console.error(`获取页面内容失败，返回为空: ${pageId}`);
      return formatResponse(res, {
        error: '获取页面内容失败',
        message: 'Notion API返回空数据'
      }, 500);
    }
    
    console.log(`成功获取文章内容, pageId: ${pageId}, 块数量: ${data.blocks ? data.blocks.length : 0}`);
    
    return formatResponse(res, {
      page: data.page,
      blocks: data.blocks,
      hasMore: data.hasMore,
      nextCursor: data.nextCursor
    });
  } catch (error) {
    console.error(`获取文章内容失败: ${error.message}`, error);
    return handleError(res, error);
  }
}

/**
 * 获取块的子块
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<Object>} 响应对象
 */
async function getBlockChildren(req, res) {
  logRequest(req, '获取块的子块');
  
  try {
    // 优先从路由参数获取blockId
    let blockId = req.params?.blockId;
    
    // 如果没有路由参数，尝试从查询参数获取
    if (!blockId) {
      blockId = req.query?.blockId;
    }
    
    // 验证块ID
    if (!blockId || !validateBlockId(blockId)) {
      return formatResponse(res, {
        error: '无效的块ID',
        message: '提供的块ID格式不正确或缺失'
      }, 400);
    }
    
    console.log(`获取块的子块数据，块ID: ${blockId}`);
    
    // 确保Notion API密钥可用
    if (!process.env.NOTION_API_KEY && req.notionConfig && req.notionConfig.apiKey) {
      // 如果环境变量中没有，但请求对象中有，则临时设置
      process.env.NOTION_API_KEY = req.notionConfig.apiKey;
      console.log('已从请求对象中获取API密钥');
    }
    
    // 增加缓存控制头，防止浏览器缓存
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    const data = await notionService.getBlockChildren(blockId);
    
    if (!data) {
      console.error(`获取块数据失败，返回为空: ${blockId}`);
      return formatResponse(res, { 
        error: '获取数据失败',
        message: 'Notion API返回空数据',
        blockId: blockId
      }, 500);
    }
    
    console.log(`成功获取块数据: ${blockId}, 子块数量: ${data.results ? data.results.length : 0}`);
    
    // 确保返回的数据有results字段，即使为空
    if (!data.results) {
      console.warn(`Notion API返回数据缺少results字段: ${blockId}`);
      data.results = [];
    }
    
    return formatResponse(res, data);
  } catch (error) {
    console.error(`获取块子块失败: ${error.message}`, error);
    
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
    
    return formatResponse(res, { 
      error: errorMessage,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, statusCode);
  }
}

module.exports = {
  getArticleContent,
  getBlockChildren
}; 