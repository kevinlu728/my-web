/**
 * @file notion-api.mjs
 * @description Notion API的路由处理模块，精简版本以减少Serverless函数数量
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-16
 */

// 导入框架
import express from 'express';

// 导入统一的服务和处理器
import { 
  notionService,
  response,
  articleHandlers,
  photoHandlers,
  databaseHandlers,
  contentHandlers,
  systemHandlers,
  helloHandlers,
  explicitConfig
} from './notion-adapter.mjs';

// 创建路由器
const router = express.Router();

// 日志中间件 - 添加环境变量信息到请求对象
router.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  // 将环境变量信息添加到请求对象，确保处理程序能访问到
  req.notionConfig = explicitConfig;
  next();
});

// 错误处理中间件
router.use((err, req, res, next) => {
  console.error('API错误:', err);
  response.handleError(res, err);
});

// --------- 核心API端点 ---------

// 合并基本API端点: hello + status + 诊断
router.get('/hello', (req, res) => {
  try {
    const hello = helloHandlers.getHelloData();
    const status = notionService.getStatus();
    res.json({
      hello,
      status: 'online',
      time: new Date().toISOString(),
      service: status,
      config: {
        apiKeySet: Boolean(explicitConfig.apiKey),
        databaseIdSet: Boolean(explicitConfig.defaultDatabaseId),
        apiVersion: explicitConfig.apiVersion
      },
      env: {
        nodeEnv: process.env.NODE_ENV || 'development',
        hasNotionKey: Boolean(process.env.NOTION_API_KEY),
        hasNotionDb: Boolean(process.env.NOTION_DATABASE_ID)
      }
    });
  } catch (error) {
    console.error('API状态错误:', error);
    res.status(500).json({
      error: '获取API状态失败',
      message: error.message
    });
  }
});

// 文章相关API - 统一入口点
router.all('/articles', async (req, res) => {
  try {
    // 确保请求中包含必要的数据库ID（如果请求中没有，使用环境变量中的）
    if (!req.body.databaseId && explicitConfig.defaultDatabaseId) {
      req.body.databaseId = explicitConfig.defaultDatabaseId;
    }
    return await articleHandlers.getArticles(req, res);
  } catch (error) {
    console.error('文章列表API错误:', error);
    return response.formatResponse(res, {
      error: '获取文章列表失败',
      message: error.message
    }, 500);
  }
});

router.all('/photos', async (req, res) => {
  try {
    // 确保请求中包含必要的数据库ID（如果请求中没有，使用环境变量中的）
    if (!req.body.lifeDatabaseId && explicitConfig.lifeDatabaseId) {
      req.body.lifeDatabaseId = explicitConfig.lifeDatabaseId;
    }
    return await photoHandlers.getPhotos(req, res);
  } catch (error) {
    console.error('照片列表API错误:', error);
    return response.formatResponse(res, {
      error: '获取照片列表失败',
      message: error.message
    }, 500);
  }
});

// 内容相关API - 统一处理文章内容和块内容
router.get('/content/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const type = req.query.type || 'article'; // 默认为文章内容
    
    // 根据类型区分处理
    if (type === 'block') {
      // 获取块的子块内容
      req.query.blockId = id;
      return await contentHandlers.getBlockChildren(req, res);
    } else {
      // 获取文章页面内容
      req.query.pageId = id;
      return await contentHandlers.getArticleContent(req, res);
    }
  } catch (error) {
    console.error('内容API错误:', error);
    return response.formatResponse(res, {
      error: '获取内容失败',
      message: error.message
    }, 500);
  }
});

// 数据库相关API - 合并端点
router.all('/database', async (req, res) => {
  try {
    // 根据请求方法和查询参数调用不同的处理器
    if (req.query.id) {
      // 获取特定数据库信息
      req.body.databaseId = req.query.id;
      return await databaseHandlers.getDatabaseInfo(req, res);
    } else if (req.body.databaseId) {
      // POST请求获取特定数据库信息
      return await databaseHandlers.getDatabaseInfo(req, res);
    } else {
      // 获取数据库列表
      return await databaseHandlers.getDatabases(req, res);
    }
  } catch (error) {
    console.error('数据库API错误:', error);
    return response.formatResponse(res, {
      error: '数据库操作失败',
      message: error.message
    }, 500);
  }
});

// --------- 保留原始端点的兼容性重定向 ---------

// 状态API - 重定向到hello统一端点
router.get('/status', (req, res) => {
  res.redirect('/api/hello');
});

// 原文章内容API - 重定向到新的统一内容API
router.get('/article-content/:pageId', (req, res) => {
  res.redirect(`/api/content/${req.params.pageId}?type=article`);
});

// 原块内容API - 重定向到新的统一内容API
router.get('/blocks/:blockId/children', (req, res) => {
  res.redirect(`/api/content/${req.params.blockId}?type=block`);
});

// 原数据库API - 重定向
router.all('/database-info', (req, res) => {
  res.redirect('/api/database');
});

router.all('/databases', (req, res) => {
  res.redirect('/api/database');
});

export const notionApiRouter = router; 