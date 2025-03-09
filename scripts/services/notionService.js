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

// 获取文章列表
export async function getArticles(databaseId) {
  try {
    console.log(`Fetching articles from Notion API for database: ${databaseId}`);
    console.log(`API Base URL: ${config.api?.baseUrl || '/api'}`);
    
    // 发送请求到服务器端 API
    const apiUrl = `${config.api?.baseUrl || '/api'}/articles`;
    console.log(`Full API URL: ${apiUrl}`);
    console.log(`Notion API Key available: ${Boolean(config.notion?.apiKey)}`);
    
    // 添加超时和错误处理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-notion-api-key': config.notion?.apiKey || ''
        },
        body: JSON.stringify({ database_id: databaseId }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`API Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API request failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API Response data structure:', Object.keys(data));
      
      // 检查数据结构
      if (!data.results || !Array.isArray(data.results)) {
        console.error('Invalid API response format:', data);
        throw new Error('Invalid API response format');
      }
      
      // 直接返回API响应，不做处理
      return data;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('API request timed out after 30 seconds');
        throw new Error('API request timed out. Please try again later.');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }
}

// 获取文章内容
export async function getArticleContent(pageId) {
  try {
    console.log(`Fetching article content for page: ${pageId}`);
    const apiUrl = `${config.api?.baseUrl || '/api'}/article-content/${pageId}`;
    console.log(`Content API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'x-notion-api-key': config.notion?.apiKey || ''
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch article content: ${response.status}`, errorText);
      throw new Error(`Failed to fetch article content: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Article content received:', data);
    
    // 确保返回的数据结构符合预期
    if (!data.page || !data.blocks) {
      console.error('Invalid article content format:', data);
      throw new Error('Invalid article content format');
    }
    
    return {
      page: data.page,
      blocks: data.blocks,
      hasMore: data.hasMore || false,
      nextCursor: data.nextCursor || null
    };
  } catch (error) {
    console.error('Error fetching article content:', error);
    throw error;
  }
}

// 获取数据库信息
export async function getDatabaseInfo(databaseId) {
  try {
    console.log(`Fetching database info for: ${databaseId}`);
    const apiUrl = `${config.api?.baseUrl || '/api'}/database-info`;
    console.log(`Database info API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-notion-api-key': config.notion?.apiKey || ''
      },
      body: JSON.stringify({ database_id: databaseId })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch database info: ${response.status}`, errorText);
      throw new Error(`Failed to fetch database info: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Database info received:', data);
    return data;
  } catch (error) {
    console.error('Error fetching database info:', error);
    throw error;
  }
}

// 测试 API 连接
export async function testApiConnection() {
  try {
    console.log('Testing API connection...');
    const apiUrl = `${config.api?.baseUrl || '/api'}/test`;
    console.log(`Test API URL: ${apiUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    try {
      const response = await fetch(apiUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`API Test Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API test failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`API test failed with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API test successful:', data);
      
      return data;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('API test request timed out after 30 seconds');
        throw new Error('API test request timed out. Please try again later.');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error testing API connection:', error);
    throw error;
  }
}

// 获取数据库列表
export async function getDatabases() {
  try {
    console.log('Fetching databases list...');
    const apiUrl = `${config.api?.baseUrl || '/api'}/databases`;
    console.log(`Databases list API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch databases: ${response.status}`, errorText);
      throw new Error(`Failed to fetch databases: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Databases list received, found ${data.results?.length || 0} databases`);
    return data;
  } catch (error) {
    console.error('Error fetching databases:', error);
    throw error;
  }
}

// 获取静态文章列表（备用方案）
export async function getStaticArticles() {
  try {
    console.log('Fetching static articles');
    const apiUrl = `${config.api?.baseUrl || '/api'}/static-articles`;
    console.log(`Static articles API URL: ${apiUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    try {
      console.log('发送静态文章请求...');
      const response = await fetch(apiUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`Static API Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Static API request failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Static API request failed with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Static articles received:', data);
      console.log('Static articles count:', data.results ? data.results.length : 0);
      
      // 确保返回的数据结构正确
      if (!data.results || !Array.isArray(data.results)) {
        console.error('Invalid static API response format:', data);
        throw new Error('Invalid static API response format');
      }
      
      return data;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Static API request timed out after 30 seconds');
        throw new Error('Static API request timed out. Please try again later.');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error fetching static articles:', error);
    
    // 返回一个有效的备用数据结构
    console.log('返回硬编码的备用数据');
    return {
      results: [
        {
          id: 'fallback-article-1',
          properties: {
            Name: {
              title: [
                {
                  plain_text: '欢迎使用云栖思渊博客（备用数据）'
                }
              ]
            },
            Category: {
              select: {
                name: '公告'
              }
            }
          },
          created_time: new Date().toISOString(),
          last_edited_time: new Date().toISOString()
        }
      ]
    };
  }
}

// 获取静态文章内容（备用方案）
export async function getStaticArticleContent(pageId) {
  try {
    console.log(`Fetching static article content for page: ${pageId}`);
    const apiUrl = `${config.api?.baseUrl || '/api'}/static-article-content?id=${pageId}`;
    console.log(`Static content API URL: ${apiUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    try {
      const response = await fetch(apiUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`Static content API Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Static content API request failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Static content API request failed with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Static article content received:', data);
      
      return data;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Static content API request timed out after 30 seconds');
        throw new Error('Static content API request timed out. Please try again later.');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error fetching static article content:', error);
    throw error;
  }
} 