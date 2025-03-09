/**
 * @file notion-api.mjs
 * @description Notion API的路由处理模块，负责处理与Notion相关的API请求
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

// Notion API 路由
import express from 'express';
import { notionService } from './notion-service.mjs';

const router = express.Router();

// 日志中间件
router.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 测试端点
router.get('/hello', (req, res) => {
  res.json({
    message: 'Hello API 测试成功',
    time: new Date().toISOString(),
    method: req.method
  });
});

// 文章列表端点
router.post('/articles', async (req, res) => {
  try {
    console.log('Request body:', req.body);
    const databaseId = req.body?.database_id || notionService.config.defaultDatabaseId;
    console.log('Using database ID:', databaseId);
    
    const data = await notionService.queryDatabase(databaseId);
    console.log('Notion API response received');
    
    if (data.results?.length > 0) {
      console.log(`Found ${data.results.length} articles`);
      data.results.sort((a, b) => {
        const timeA = new Date(a.created_time || 0);
        const timeB = new Date(b.created_time || 0);
        return timeB - timeA;
      });
    } else {
      console.log('No articles found in response');
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(error.message.includes('超时') ? 504 : 500).json({ 
      error: 'Failed to fetch articles', 
      message: error.message 
    });
  }
});

// 获取文章内容端点
router.get('/article-content/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const pageSize = parseInt(req.query.page_size) || 10;
    const cursor = req.query.cursor;

    console.log(`Fetching article content for page ${pageId}`);
    
    const data = await notionService.getPageContent(pageId, pageSize, cursor);
    
    res.json({
      page: data.page,
      blocks: data.blocks,
      hasMore: data.hasMore,
      nextCursor: data.nextCursor
    });
  } catch (error) {
    console.error('Error fetching article content:', error);
    res.status(500).json({ 
      error: 'Error fetching article content', 
      message: error.message 
    });
  }
});

// 获取块的子块数据
router.get('/blocks/:blockId/children', async (req, res) => {
  try {
    const { blockId } = req.params;
    console.log(`获取块的子块数据，块ID: ${blockId}`);
    
    const data = await notionService.getBlockChildren(blockId);
    console.log(`成功获取块的子块数据，共 ${data.results?.length || 0} 个子块`);
    
    res.json(data);
  } catch (error) {
    console.error('获取块的子块数据失败:', error);
    res.status(500).json({ 
      error: '获取块的子块数据失败', 
      message: error.message 
    });
  }
});

// 获取数据库信息
router.post('/database-info', async (req, res) => {
  try {
    const { database_id } = req.body;
    
    if (!database_id) {
      return res.status(400).json({ error: '缺少数据库ID' });
    }
    
    console.log(`获取数据库信息，数据库ID: ${database_id}`);
    
    const data = await notionService.getDatabaseInfo(database_id);
    console.log(`成功获取数据库信息: ${database_id}`);
    
    res.json(data);
  } catch (error) {
    console.error('获取数据库信息失败:', error);
    res.status(500).json({ 
      error: '获取数据库信息失败', 
      message: error.message 
    });
  }
});

// 获取所有数据库列表
router.get('/databases', async (req, res) => {
  try {
    console.log('获取所有数据库列表');
    
    const data = await notionService.listDatabases();
    console.log(`成功获取数据库列表，共 ${data.results?.length || 0} 个数据库`);
    
    res.json(data);
  } catch (error) {
    console.error('获取数据库列表失败:', error);
    res.status(500).json({ 
      error: '获取数据库列表失败', 
      message: error.message 
    });
  }
});

// 添加清除缓存的路由
router.post('/clear-cache', (req, res) => {
  notionService.clearCache();
  res.json({ message: 'Cache cleared successfully' });
});

export const notionApiRouter = router; 