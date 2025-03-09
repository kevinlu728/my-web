/**
 * @file notion-service.mjs
 * @description Notion API服务封装，提供与Notion API交互的高级方法
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

// Notion API 服务
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 基础配置
const config = {
  apiKey: process.env.NOTION_API_KEY || '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',
  defaultDatabaseId: process.env.NOTION_DATABASE_ID || '1a932af826e680df8bf7f320b51930b9',
  headers: {
    'Authorization': `Bearer ${process.env.NOTION_API_KEY || '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'}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28'
  },
  timeout: 10000,     // 10秒超时
  cacheTime: 5 * 60 * 1000, // 5分钟缓存
  retry: {
    maxAttempts: 3, // 最大重试次数
    delay: 1000,    // 初始延迟（毫秒）
    maxDelay: 5000  // 最大延迟（毫秒）
  },
  rateLimit: {
    windowMs: 60000,  // 1分钟窗口
    maxRequests: 30   // 最大请求数
  }
};

// 简单的内存缓存实现
const cache = {
  data: new Map(),
  
  // 获取缓存
  get(key) {
    const item = this.data.get(key);
    if (!item) return null;
    
    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.data.delete(key);
      return null;
    }
    
    return item.value;
  },
  
  // 设置缓存
  set(key, value, ttl = config.cacheTime) {
    this.data.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  },
  
  // 清除指定键的缓存
  delete(key) {
    this.data.delete(key);
  },
  
  // 清除所有缓存
  clear() {
    this.data.clear();
  }
};

// 请求限流实现
const rateLimiter = {
  requests: new Map(),
  
  isAllowed(clientId = 'default') {
    const now = Date.now();
    const windowStart = now - config.rateLimit.windowMs;
    
    // 清理过期的请求记录
    this.cleanup(windowStart);
    
    // 获取当前窗口的请求记录
    const requestTimes = this.requests.get(clientId) || [];
    const recentRequests = requestTimes.filter(time => time > windowStart);
    
    // 检查是否超出限制
    if (recentRequests.length >= config.rateLimit.maxRequests) {
      return false;
    }
    
    // 记录新请求
    recentRequests.push(now);
    this.requests.set(clientId, recentRequests);
    return true;
  },
  
  cleanup(windowStart) {
    for (const [clientId, times] of this.requests.entries()) {
      const validTimes = times.filter(time => time > windowStart);
      if (validTimes.length === 0) {
        this.requests.delete(clientId);
      } else {
        this.requests.set(clientId, validTimes);
      }
    }
  }
};

// 获取所有块内容
async function getAllBlockChildren(blockId, pageSize = 100, startCursor = undefined, fetchAll = false) {
  let allBlocks = [];
  let hasMore = true;
  let nextCursor = startCursor;

  try {
    // 如果不是获取所有内容，只获取一页
    if (!fetchAll) {
      const response = await fetch(
        `https://api.notion.com/v1/blocks/${blockId}/children?page_size=${pageSize}${nextCursor ? `&start_cursor=${nextCursor}` : ''}`,
        {
          method: 'GET',
          headers: config.headers
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch blocks: ${response.status}`);
      }

      const data = await response.json();
      return {
        blocks: data.results,
        hasMore: data.has_more,
        nextCursor: data.next_cursor
      };
    }

    // 获取所有内容的逻辑
    while (hasMore) {
      const response = await fetch(
        `https://api.notion.com/v1/blocks/${blockId}/children?page_size=${pageSize}${nextCursor ? `&start_cursor=${nextCursor}` : ''}`,
        {
          method: 'GET',
          headers: config.headers
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch blocks: ${response.status}`);
      }

      const data = await response.json();
      allBlocks = allBlocks.concat(data.results);
      hasMore = data.has_more;
      nextCursor = data.next_cursor;
    }

    return {
      blocks: allBlocks,
      hasMore: false,
      nextCursor: null
    };
  } catch (error) {
    console.error('Error in getAllBlockChildren:', error);
    throw error;
  }
}

// Notion API 服务
const notionService = {
  config,
  
  // 延迟函数
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // 计算重试延迟时间
  getRetryDelay(attempt) {
    const { delay, maxDelay } = config.retry;
    const retryDelay = delay * Math.pow(2, attempt - 1); // 指数退避
    return Math.min(retryDelay, maxDelay);
  },

  // 超时处理函数
  async withTimeout(promise) {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求超时')), config.timeout);
    });
    return Promise.race([promise, timeout]);
  },

  // 统一的API调用函数
  async fetch(endpoint, options = {}, attempt = 1) {
    const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
    
    // 检查缓存
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`Using cached data for ${endpoint}`);
      return cachedData;
    }

    // 检查请求限流
    if (!rateLimiter.isAllowed()) {
      console.warn('Rate limit exceeded');
      throw new Error('请求过于频繁，请稍后重试');
    }

    const url = `https://api.notion.com/v1/${endpoint}`;
    try {
      const response = await this.withTimeout(
        fetch(url, {
          ...options,
          headers: config.headers
        })
      );

      console.log(`Notion API ${options.method || 'GET'} ${endpoint}: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Notion API error: ${response.status}`, errorText);
        
        const errorMessage = {
          404: '数据库或页面未找到。请确保集成已获得正确权限。',
          401: 'API令牌无效或已过期。请检查API令牌。',
          403: '权限不足。请检查集成权限设置。',
          429: '请求过于频繁，请稍后重试。'
        }[response.status] || '请求失败';

        // 对特定错误进行重试
        if ((response.status === 429 || response.status >= 500) && 
          attempt < config.retry.maxAttempts) {
          const retryDelay = this.getRetryDelay(attempt);
          console.warn(`Retrying request (${attempt}/${config.retry.maxAttempts}) after ${retryDelay}ms`);
          await this.delay(retryDelay);
          return this.fetch(endpoint, options, attempt + 1);
        }

        throw new Error(errorMessage);
      }
    
      const data = await response.json();
          
      // 缓存响应数据
      if (options.method === 'GET' || endpoint.includes('query')) {
        cache.set(cacheKey, data);
      }

      return data;
    } catch (error) {
      if (error.message === '请求超时' && attempt < config.retry.maxAttempts) {
        const retryDelay = this.getRetryDelay(attempt);
        console.warn(`Request timeout, retrying (${attempt}/${config.retry.maxAttempts}) after ${retryDelay}ms`);
        await this.delay(retryDelay);
        return this.fetch(endpoint, options, attempt + 1);
      }
      throw error;
    }
  },

  // 查询数据库
  async queryDatabase(databaseId = config.defaultDatabaseId) {
    return this.fetch(`databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  },

  // 测试API连接
  async testConnection() {
    // 测试连接不使用缓存
    cache.delete('users/me');
    return this.fetch('users/me');
  },

  // 获取数据库列表
  async listDatabases() {
    return this.fetch('search', {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          value: 'database',
          property: 'object'
        }
      })
    });
  },

  // 获取数据库信息
  async getDatabaseInfo(databaseId) {
    return this.fetch(`databases/${databaseId}`);
  },

  // 获取块的子块
  async getBlockChildren(blockId, pageSize = 100) {
    return this.fetch(`blocks/${blockId}/children?page_size=${pageSize}`);
  },

  // 获取页面内容
  async getPageContent(pageId, pageSize = 10, cursor = undefined) {
    try {
      const [pageData, blocksData] = await Promise.all([
        this.fetch(`pages/${pageId}`),
        getAllBlockChildren(pageId, pageSize, cursor, false)
      ]);

      return {
        page: pageData,
        ...blocksData
      };
    } catch (error) {
      console.error('Error in getPageContent:', error);
      throw error;
    }
  },

  // 清除所有缓存
  clearCache() {
    cache.clear();
    console.log('Cache cleared');
  }
};

export { notionService }; 