/**
 * @file notion-service.js
 * @description Notion API服务封装，提供与Notion API交互的高级方法
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-16
 */

// 导入配置
const { notionConfig } = require('../config/notion-config');

// 基础配置
const config = {
  apiKey: process.env.NOTION_API_KEY,
  defaultDatabaseId: process.env.NOTION_DATABASE_ID,
  headers: {
    'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
    'Content-Type': 'application/json',
    'Notion-Version': notionConfig.apiVersion
  },
  timeout: 30000,     // 30秒超时
  cacheTime: notionConfig.cacheDuration || 2 * 60 * 1000, // 使用配置的缓存时间或默认2分钟
  retry: {
    maxRetries: 3,    // 最多重试3次
    initialDelay: 1000, // 初始延迟1秒
    maxDelay: 5000    // 最大延迟5秒
  }
};

// 内存缓存
const cache = new Map();

// 缓存管理
const cacheManager = {
  get(key) {
    const item = cache.get(key);
    if (!item) return null;
    
    const now = Date.now();
    if (item.expiry && item.expiry < now) {
      cache.delete(key);
      return null;
    }
    
    return item.value;
  },
  
  set(key, value, ttl = config.cacheTime) {
    const expiry = ttl ? Date.now() + ttl : null;
    cache.set(key, { value, expiry });
    console.log(`缓存设置: ${key}, 有效期: ${expiry ? new Date(expiry).toISOString() : '永久'}`);
    return value;
  },
  
  delete(key) {
    return cache.delete(key);
  },
  
  clear() {
    console.log(`清除所有缓存，当前缓存项数量: ${cache.size}`);
    cache.clear();
    return true;
  }
};

// 带重试的fetch函数
async function fetchWithRetry(url, options) {
  // 确保headers已经包含最新的API密钥
  if (options.headers && !options.headers.Authorization && config.apiKey) {
    options.headers.Authorization = `Bearer ${config.apiKey}`;
    console.log('自动添加API密钥到请求头');
  }
  
  let lastError;
  let delay = config.retry.initialDelay;
  
  console.log(`请求Notion API: ${url}`);
  
  // 打印请求头信息（不包含具体的API密钥）
  console.log('请求头:', {
    ...options.headers,
    Authorization: options.headers?.Authorization ? '[已设置]' : '[未设置]'
  });
  
  for (let attempt = 0; attempt <= config.retry.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);
      
      options.signal = controller.signal;
      
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      
      // 处理API错误情况
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `HTTP错误 ${response.status}`);
        error.status = response.status;
        error.code = errorData.code;
        throw error;
      }
      
      return await response.json();
    } catch (error) {
      lastError = error;
      
      // 判断是否可重试的错误
      if (error.name === 'AbortError') {
        console.warn(`请求超时，尝试 ${attempt + 1}/${config.retry.maxRetries + 1}`);
      } else if (error.status === 429 || error.status >= 500) {
        console.warn(`API请求失败 (${error.status || error.message})，尝试 ${attempt + 1}/${config.retry.maxRetries + 1}`);
      } else {
        // 如果是客户端错误（非5xx，非429），不重试
        throw error;
      }
      
      // 最后一次尝试后直接抛出错误
      if (attempt === config.retry.maxRetries) {
        throw lastError;
      }
      
      // 等待延迟后重试
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // 指数退避算法增加延迟
      delay = Math.min(delay * 1.5, config.retry.maxDelay);
    }
  }
}

// Notion API服务
const notionService = {
  config,
  
  /**
   * 查询数据库中的文章列表
   * @param {string} databaseId - 数据库ID，默认使用环境变量
   * @returns {Promise<Object>} 数据库查询结果
   */
  async queryDatabase(databaseId = config.defaultDatabaseId) {
    if (!databaseId) {
      throw new Error('未提供数据库ID，请在请求中指定或设置环境变量');
    }
    
    const cacheKey = `db:${databaseId}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      console.log(`使用缓存数据: ${cacheKey}`);
      return cached;
    }
    
    console.log(`查询数据库: ${databaseId}`);
    
    const data = await fetchWithRetry(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify({
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: 100
      })
    });
    
    // 缓存结果
    return cacheManager.set(cacheKey, data);
  },
  
  /**
   * 获取页面内容和块
   * @param {string} pageId - 页面ID
   * @param {number} pageSize - 每页块数量
   * @param {string} cursor - 分页游标
   * @returns {Promise<Object>} 页面内容和块
   */
  async getPageContent(pageId, pageSize = 10, cursor = undefined) {
    if (!pageId) {
      throw new Error('缺少页面ID');
    }
    
    if (!config.apiKey) {
      console.error('API密钥未设置，无法获取页面内容');
      throw new Error('API密钥未设置');
    }
    
    // 为每个游标创建不同的缓存键
    const cacheKey = `page:${pageId}:${pageSize}:${cursor || 'initial'}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      console.log(`使用缓存的页面内容: ${cacheKey}`);
      return cached;
    }
    
    console.log(`获取页面 ${pageId} 及其内容，API密钥状态: ${config.apiKey ? '已设置' : '未设置'}`);
    
    try {
      // 使用新的方法获取页面内容 - 使用单独的请求而不是并行
      // 1. 先获取页面属性
      console.log(`开始获取页面属性: ${pageId}`);
      const page = await fetchWithRetry(`https://api.notion.com/v1/pages/${pageId}`, {
        method: 'GET',
        headers: config.headers
      });
      
      // 如果能获取页面，再获取页面的块
      console.log(`开始获取页面块: ${pageId}`);
      
      // 修复API调用 - 使用正确的URL格式和请求参数
      let blocksUrl = `https://api.notion.com/v1/blocks/${pageId}/children`;
      if (cursor) {
        blocksUrl += `?start_cursor=${cursor}&page_size=${pageSize}`;
      } else if (pageSize) {
        blocksUrl += `?page_size=${pageSize}`;
      }
      
      const blocksResponse = await fetchWithRetry(blocksUrl, {
        method: 'GET',
        headers: config.headers
      });
      
      console.log(`成功获取页面数据: 共有 ${blocksResponse.results ? blocksResponse.results.length : 0} 个块`);
      
      const result = {
        page,
        blocks: blocksResponse.results || [],
        hasMore: blocksResponse.has_more || false,
        nextCursor: blocksResponse.next_cursor || null
      };
      
      // 缓存结果
      cacheManager.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`获取页面内容出错: ${error.message}`, error);
      
      // 提供更多诊断信息
      if (error.code === 'object_not_found') {
        console.error(`Notion无法找到页面 ${pageId} - 请检查页面ID是否正确，以及集成权限是否已设置`);
        
        // 尝试查询数据库，获取有效的页面ID供参考
        try {
          if (config.defaultDatabaseId) {
            console.log(`尝试查询数据库 ${config.defaultDatabaseId} 获取有效页面ID...`);
            const dbData = await this.queryDatabase(config.defaultDatabaseId);
            if (dbData && dbData.results && dbData.results.length > 0) {
              const validIds = dbData.results.slice(0, 3).map(page => page.id);
              console.log(`数据库中的有效页面ID示例: ${validIds.join(', ')}`);
            }
          }
        } catch (dbError) {
          console.error(`尝试获取有效页面ID时出错: ${dbError.message}`);
        }
      }
      
      // 重新抛出错误
      throw error;
    }
  },
  
  /**
   * 获取块的子块
   * @param {string} blockId - 块ID
   * @returns {Promise<Object>} 子块列表
   */
  async getBlockChildren(blockId) {
    if (!blockId) {
      throw new Error('缺少块ID');
    }
    
    const cacheKey = `block:${blockId}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      console.log(`使用缓存的子块: ${cacheKey}`);
      return cached;
    }
    
    console.log(`获取块 ${blockId} 的子块`);
    
    try {
      const response = await fetchWithRetry(`https://api.notion.com/v1/blocks/${blockId}/children`, {
        method: 'GET',
        headers: config.headers
      });
      
      // 处理嵌套块的特殊情况
      if (response.results) {
        for (const block of response.results) {
          // 如果块有子块，递归获取
          if (block.has_children) {
            try {
              const childData = await this.getBlockChildren(block.id);
              // 将子块数据附加到块上
              block.children = childData.results;
            } catch (childError) {
              console.error(`获取块 ${block.id} 的子块失败:`, childError.message);
              // 继续处理其他块，不要因为一个子块失败而中断
              block.children = [];
            }
          }
        }
      }
      
      // 缓存结果
      return cacheManager.set(cacheKey, response);
    } catch (error) {
      // 处理特定的错误情况
      if (error.status === 404) {
        throw new Error(`未找到块: ${blockId}`);
      }
      throw error;
    }
  },
  
  /**
   * 获取数据库信息
   * @param {string} databaseId - 数据库ID
   * @returns {Promise<Object>} 数据库信息
   */
  async getDatabaseInfo(databaseId) {
    if (!databaseId) {
      throw new Error('缺少数据库ID');
    }
    
    const cacheKey = `dbinfo:${databaseId}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      console.log(`使用缓存的数据库信息: ${cacheKey}`);
      return cached;
    }
    
    console.log(`获取数据库信息: ${databaseId}`);
    
    const data = await fetchWithRetry(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: config.headers
    });
    
    // 缓存结果
    return cacheManager.set(cacheKey, data);
  },
  
  /**
   * 获取所有数据库列表
   * @returns {Promise<Object>} 数据库列表
   */
  async listDatabases() {
    const cacheKey = 'dbs:all';
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      console.log(`使用缓存的数据库列表`);
      return cached;
    }
    
    console.log(`获取数据库列表`);
    
    const data = await fetchWithRetry(`https://api.notion.com/v1/search`, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify({
        filter: { property: 'object', value: 'database' }
      })
    });
    
    // 缓存结果
    return cacheManager.set(cacheKey, data);
  },
  
  /**
   * 清除所有缓存
   */
  clearCache() {
    return cacheManager.clear();
  },
  
  /**
   * 获取API服务状态
   * @returns {Object} 服务状态信息
   */
  getStatus() {
    return {
      connected: Boolean(config.apiKey),
      apiVersion: notionConfig.apiVersion,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      databaseId: config.defaultDatabaseId ? `${config.defaultDatabaseId.substring(0, 8)}...` : '未设置'
    };
  },
  
  /**
   * 更新服务配置
   * @param {Object} newConfig - 新的配置对象
   */
  updateConfig(newConfig) {
    if (newConfig.apiKey) {
      config.apiKey = newConfig.apiKey;
      config.headers.Authorization = `Bearer ${newConfig.apiKey}`;
      console.log('更新了API密钥');
    }
    
    if (newConfig.defaultDatabaseId) {
      config.defaultDatabaseId = newConfig.defaultDatabaseId;
      console.log(`更新了默认数据库ID: ${newConfig.defaultDatabaseId}`);
    }
    
    if (newConfig.apiVersion) {
      config.headers['Notion-Version'] = newConfig.apiVersion;
      console.log(`更新了API版本: ${newConfig.apiVersion}`);
    }
  }
};

module.exports = { notionService }; 