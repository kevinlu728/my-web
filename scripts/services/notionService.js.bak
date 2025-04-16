/**
 * @file notionService.js
 * @description Notion API服务模块，负责与Notion API交互获取数据
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该模块封装了与Notion API的所有交互逻辑，提供以下功能：
 * - 获取文章列表数据
 * - 获取文章详细内容
 * - 处理API响应和错误
 * - 数据格式转换和清理
 * 
 * 主要导出函数：
 * - getArticles: 获取文章列表
 * - getArticleContent: 获取文章详细内容
 * 
 * 该模块依赖于fetch API进行网络请求，并使用环境配置中的API密钥和端点。
 */

import config from '../config/config.js';
import logger from '../utils/logger.js';

// 获取文章列表
export async function getArticles(databaseId) {
  try {
    logger.info(`Fetching articles from Notion API for database: ${databaseId}`);
    logger.info(`API Base URL: ${config.api?.baseUrl || '/api'}`);
    
    // 发送请求到服务器端 API
    const apiUrl = `${config.api?.baseUrl || '/api'}/articles`;
    logger.info(`Full API URL: ${apiUrl}`);
    
    // 修改: 同时提供 database_id 和 databaseId 参数以兼容两种格式
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        database_id: databaseId, // 原始参数名
        databaseId: databaseId,  // 新参数名
        limit: 100 
      })
    });
    
    // 记录请求信息
    logger.info('Request params:', { 
      database_id: databaseId, 
      databaseId: databaseId, 
      limit: 100 
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`API request failed: ${response.status} ${response.statusText}`, errorText);
      // 新增: 详细记录错误信息
      logger.error('详细错误信息:', {
        method: 'POST',
        url: apiUrl,
        params: { database_id: databaseId, databaseId: databaseId, limit: 100 },
        statusCode: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers]),
        responseText: errorText
      });
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    logger.debug('API Response: ', data);
    
    // 新增: 检查响应结构并记录
    const responseStructure = {
      hasResults: !!data.results,
      resultsLength: data.results?.length,
      hasArticles: !!data.articles,
      articlesLength: data.articles?.length,
      hasMore: !!data.hasMore || !!data.has_more,
      nextCursor: data.nextCursor || data.next_cursor
    };
    logger.info('Response structure check:', responseStructure);
    
    // 检查数据结构
    if (!data.results && !data.articles) {
      logger.error('Invalid API response format - missing results:', data);
      throw new Error('Invalid API response format - missing article data');
    }
    
    // 兼容两种返回格式
    const articles = data.articles || data.results;
    
    if (!Array.isArray(articles)) {
      logger.error('Invalid article data - not an array:', articles);
      throw new Error('Invalid API response format - articles is not an array');
    }
    
    // 返回文章列表，分页信息和源数据
    return {
      articles,
      hasMore: data.hasMore || data.has_more || false,
      nextCursor: data.nextCursor || data.next_cursor || null,
      raw: data
    };
  } catch (error) {
    logger.error('Error fetching articles:', error);
    // 新增: 详细记录异常堆栈
    logger.error('Error stack:', error.stack);
    logger.error('Error occurred at:', new Date().toISOString());
    throw error;
  }
}

// 获取文章内容
export async function getArticleContent(pageId) {
  try {
    logger.info(`Fetching article content for page: ${pageId}`);
    
    // 重要：检查pageId是否有效，无效时不请求API
    if (!pageId || pageId === 'undefined' || pageId === 'null') {
      logger.error('Invalid pageId:', pageId);
      throw new Error('Invalid page ID provided');
    }
    
    // 使用新的统一内容API端点
    const apiUrl = `${config.api?.baseUrl || '/api'}/article-content/${pageId}`;
    logger.info(`Content API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Failed to fetch article content: ${response.status}`, errorText);
      throw new Error(`Failed to fetch article content: ${response.status}`);
    }
    
    const data = await response.json();
    logger.debug('Article content received:', data);
    
    // 确保返回的数据结构符合预期
    if (!data.page || !data.blocks) {
      logger.error('Invalid article content format:', data);
      throw new Error('Invalid article content format');
    }
    
    return {
      page: data.page,
      blocks: data.blocks,
      hasMore: data.hasMore || false,
      nextCursor: data.nextCursor || null
    };
  } catch (error) {
    logger.error('Error fetching article content:', error);
    throw error;
  }
}

// 获取数据库信息
export async function getDatabaseInfo(databaseId) {
  try {
    logger.info(`Fetching database info for: ${databaseId}`);
    const apiUrl = `${config.api?.baseUrl || '/api'}/database-info`;
    logger.info(`Database info API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ database_id: databaseId })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Failed to fetch database info: ${response.status}`, errorText);
      throw new Error(`Failed to fetch database info: ${response.status}`);
    }
    
    const data = await response.json();
    logger.info('Database info received:', data);
    return data;
  } catch (error) {
    logger.error('Error fetching database info:', error);
    throw error;
  }
}

// 测试 API 连接
export async function testApiConnection() {
  try {
    logger.info('Testing API connection...');
    const apiUrl = `${config.api?.baseUrl || '/api'}/hello`;
    logger.info(`Test API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`API connection test failed: ${response.status}`, errorText);
      throw new Error(`API connection test failed: ${response.status}`);
    }
    
    const data = await response.json();
    logger.info('API connection test successful:', data);
    
    return data;
  } catch (error) {
    logger.error('Error testing API connection:', error);
    throw error;
  }
}

// 获取数据库列表
export async function getDatabases() {
  try {
    logger.info('Fetching databases list...');
    const apiUrl = `${config.api?.baseUrl || '/api'}/databases`;
    logger.info(`Databases list API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Failed to fetch databases: ${response.status}`, errorText);
      throw new Error(`Failed to fetch databases: ${response.status}`);
    }
    
    const data = await response.json();
    logger.info(`Databases list received, found ${data.results?.length || 0} databases`);
    return data;
  } catch (error) {
    logger.error('Error fetching databases:', error);
    throw error;
  }
} 