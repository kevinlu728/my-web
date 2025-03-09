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
      
      // 处理每个页面，提取所需信息
      const articles = [];
      
      for (const page of data.results) {
        console.log('Processing page: ', page.id);
        
        // 确保页面有 ID
        if (!page.id) {
          console.error('Page missing ID:', page);
          continue;
        }
        
        // 提取标题
        let title = 'Untitled';
        
        // 尝试从 properties 中获取标题
        if (page.properties) {
          // 尝试从 Name 或 Title 属性中获取标题
          const titleProperty = page.properties.Name || page.properties.Title;
          
          if (titleProperty && titleProperty.title && Array.isArray(titleProperty.title) && titleProperty.title.length > 0) {
            title = titleProperty.title[0].plain_text || title;
          }
        }
        
        // 提取 URL
        let url = '';
        if (page.url) {
          url = page.url;
        } else if (page.public_url) {
          url = page.public_url;
        }
        
        // 使用原始 ID，不做任何修改
        const pageId = page.id;
        
        // 提取创建时间
        const createdTime = page.created_time ? new Date(page.created_time) : new Date();
        
        // 提取最后编辑时间
        const lastEditedTime = page.last_edited_time ? new Date(page.last_edited_time) : new Date();
        
        // 提取分类
        let category = 'Uncategorized';
        if (page.properties && page.properties.Category) {
          const categoryProp = page.properties.Category;
          
          if (categoryProp.select && categoryProp.select.name) {
            category = categoryProp.select.name;
          } else if (categoryProp.multi_select && Array.isArray(categoryProp.multi_select) && categoryProp.multi_select.length > 0) {
            category = categoryProp.multi_select[0].name;
          }
        }
        
        // 提取发布时间
        let publishDate = null;
        if (page.properties && page.properties['Publish Date'] && page.properties['Publish Date'].date) {
          publishDate = page.properties['Publish Date'].date.start;
        }
        
        // 构建文章对象
        const article = {
          id: pageId,
          title: title,
          url: url,
          created_time: page.created_time,
          last_edited_time: page.last_edited_time,
          publish_date: publishDate,
          category: category,
          properties: page.properties // 保留原始属性以备后用
        };
        
        articles.push(article);
      }
      
      // 按发布时间排序，没有发布时间的排在最后
      articles.sort((a, b) => {
        // 如果两篇文章都有发布时间，按发布时间降序排序
        if (a.publish_date && b.publish_date) {
          return new Date(b.publish_date) - new Date(a.publish_date);
        }
        // 如果只有 a 有发布时间，a 排在前面
        if (a.publish_date) return -1;
        // 如果只有 b 有发布时间，b 排在前面
        if (b.publish_date) return 1;
        // 如果都没有发布时间，按创建时间降序排序
        return new Date(b.created_time) - new Date(a.created_time);
      });
      
      console.log(`Processed ${articles.length} articles`);
      
      return articles;
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