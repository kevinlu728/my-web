/**
 * @file photo-handlers.js
 * @description 照片API的内部处理函数
 * @author 陆凯
 * @created 2024-07-16
 */

const { notionService } = require('../services/notion-service');
const { formatResponse, handleError, logRequest } = require('../utils/response');

/**
 * 获取照片列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<Object>} 响应对象
 */
async function getPhotos(req, res) {
  logRequest(req, '获取照片列表');
  
  try {
    // 1. 获取数据库ID，优先从请求中获取，其次从请求对象的notionConfig获取，最后尝试环境变量
    let databaseId = req.body.lifeDatabaseId;
    
    // 如果请求中没有，尝试从req.notionConfig获取
    if (!databaseId && req.notionConfig && req.notionConfig.lifeDatabaseId) {
      databaseId = req.notionConfig.lifeDatabaseId;
      console.log(`使用请求对象中的数据库ID: ${databaseId}`);
    }
    
    // 如果仍然没有，尝试从环境变量获取
    if (!databaseId) {
      databaseId = process.env.NOTION_DATABASE_LIFEPHOTOS_ID;
      console.log(`使用环境变量中的数据库ID: ${databaseId}`);
    }
    
    // 最终还是没有，则返回错误
    if (!databaseId) {
      return formatResponse(res, {
        error: '未提供数据库ID',
        message: '请在请求中提供lifeDatabaseId或设置环境变量NOTION_DATABASE_LIFEPHOTOS_ID'
      }, 400);
    }
    
    console.log(`使用数据库ID: ${databaseId}`);
    
    // 2. 从请求中获取分页参数和过滤条件
    const startCursor = req.body.startCursor || req.body.start_cursor;
    const pageSize = req.body.pageSize || req.body.page_size || 100;
    const filter = req.body.filter;
    
    // 特殊处理sorts参数，保证原样传递客户端提供的sorts参数
    let sorts = req.body.sorts;
    if (!sorts) {
      // 如果没有提供，使用默认的Photo Date降序排序
      sorts = [{ property: "Photo Date", direction: "descending" }];
    }
    
    console.log(`查询参数: startCursor=${startCursor || '无'}, pageSize=${pageSize}, filter=${!!filter}, sorts=`, sorts);
    
    // 3. 调用服务获取数据，使用支持游标的方法
    const data = await notionService.queryDatabaseWithCursor(databaseId, {
      startCursor,
      pageSize,
      filter,
      sorts
    });
    
    // 4. 构建并返回响应
    return formatResponse(res, {
      success: true,
      results: data.results,
      photos: data.results, // 增加photos字段以保持一致性
      hasMore: data.has_more,
      has_more: data.has_more, // 兼容旧版本
      nextCursor: data.next_cursor,
      next_cursor: data.next_cursor // 兼容旧版本
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getPhotos
}; 