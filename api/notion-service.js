/**
 * @file notion-service.js
 * @description Notion API服务封装，提供与Notion API交互的高级方法
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

// 基础配置
const config = {
  apiKey: process.env.NOTION_API_KEY,
  defaultDatabaseId: process.env.NOTION_DATABASE_ID,
  headers: {
    'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28'
  },
  timeout: 30000,     // 增加到30秒超时
  cacheTime: 2 * 60 * 1000, // 2分钟缓存
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
  
  // 删除缓存
  delete(key) {
    this.data.delete(key);
  },
  
  // 清空缓存
  clear() {
    this.data.clear();
  }
};

// 工具函数：延迟执行
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 工具函数：带重试的API请求
async function fetchWithRetry(url, options) {
  let lastError;
  let delayTime = config.retry.delay;
  
  console.log(`开始fetchWithRetry请求: ${options.method} ${url}`);
  console.log(`请求配置: ${JSON.stringify({
    method: options.method,
    headers: {
      'Content-Type': options.headers['Content-Type'],
      'Notion-Version': options.headers['Notion-Version'],
      'Authorization': '已设置但不显示'
    },
    body: options.body ? '已设置' : undefined
  })}`);
  
  for (let attempt = 1; attempt <= config.retry.maxAttempts; attempt++) {
    try {
      console.log(`API请求 (尝试 ${attempt}/${config.retry.maxAttempts}): ${options.method} ${url}`);
      
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);
      
      // 检查API密钥是否存在
      if (!process.env.NOTION_API_KEY) {
        console.error('API密钥未配置，请检查环境变量NOTION_API_KEY');
        throw new Error('API密钥未配置');
      }
      
      // 确保headers包含所有必要的字段
      const headers = {
        'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      };
      
      console.log(`请求头: ${JSON.stringify({
        'Content-Type': headers['Content-Type'],
        'Notion-Version': headers['Notion-Version'],
        'Authorization': '已设置但不显示'
      })}`);
      
      // 记录API密钥前几个字符（安全起见）
      const apiKeyPreview = process.env.NOTION_API_KEY ? 
        `${process.env.NOTION_API_KEY.substring(0, 4)}...${process.env.NOTION_API_KEY.substring(process.env.NOTION_API_KEY.length - 4)}` : 
        '未设置';
      console.log(`API密钥预览: ${apiKeyPreview}`);
      
      const startTime = Date.now();
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      const endTime = Date.now();
      
      clearTimeout(timeoutId);
      
      console.log(`API响应状态: ${response.status} ${response.statusText}, 耗时: ${endTime - startTime}ms`);
      console.log(`响应头: ${JSON.stringify(Object.fromEntries([...response.headers.entries()]))}`);
      
      // 克隆响应对象，这样可以多次读取响应体
      const clonedResponse = response.clone();
      
      if (!response.ok) {
        let errorData;
        let errorMessage = `API请求失败: ${response.status} ${response.statusText}`;
        
        try {
          errorData = await clonedResponse.json();
          console.error('API错误响应:', errorData);
          
          // 提取Notion API的详细错误信息
          if (errorData.code) {
            errorMessage += ` - 错误代码: ${errorData.code}`;
          }
          
          if (errorData.message) {
            errorMessage += ` - 错误信息: ${errorData.message}`;
          }
          
          // 检查是否是认证错误
          if (response.status === 401) {
            console.error('API认证失败，请检查API密钥是否正确');
            errorMessage = 'API认证失败，请检查API密钥是否正确';
          }
          
          // 检查是否是权限错误
          if (response.status === 403) {
            console.error('API权限不足，请检查API密钥权限');
            errorMessage = 'API权限不足，请检查API密钥权限';
          }
          
          // 检查是否是请求过多
          if (response.status === 429) {
            console.error('API请求过多，请稍后重试');
            errorMessage = 'API请求过多，请稍后重试';
          }
          
          // 检查是否是服务器错误
          if (response.status >= 500) {
            console.error('Notion服务器错误');
            errorMessage = `Notion服务器错误 (${response.status})`;
          }
        } catch (e) {
          try {
            const errorText = await clonedResponse.text();
            console.error('API错误响应文本:', errorText);
            errorData = { error: errorText };
            errorMessage += ` - ${errorText}`;
          } catch (textError) {
            console.error('无法读取错误响应:', textError);
            errorMessage += ' - 无法读取错误详情';
          }
        }
        
        console.error(`API请求失败详情: ${errorMessage}`);
        throw new Error(errorMessage);
      }
      
      // 使用克隆的响应对象读取数据
      let data;
      try {
        const responseText = await response.text();
        console.log(`API响应文本长度: ${responseText.length} 字符`);
        console.log(`API响应文本预览: ${responseText.substring(0, 200)}...`);
        
        try {
          data = JSON.parse(responseText);
          console.log(`JSON解析成功，数据类型: ${typeof data}, 是否为对象: ${typeof data === 'object'}`);
        } catch (jsonError) {
          console.error('JSON解析失败:', jsonError, '响应文本:', responseText.substring(0, 200) + '...');
          throw new Error(`JSON解析失败: ${jsonError.message}`);
        }
      } catch (textError) {
        console.error('读取响应文本失败:', textError);
        throw new Error(`读取响应文本失败: ${textError.message}`);
      }
      
      console.log(`API响应成功，数据类型: ${typeof data}, 是否为对象: ${typeof data === 'object'}, 是否有results: ${data && 'results' in data}`);
      
      if (data && 'results' in data) {
        console.log(`结果数量: ${data.results.length}`);
        if (data.results.length > 0) {
          console.log(`第一个结果类型: ${data.results[0].type || '未知'}`);
        }
      }
      
      return data;
    } catch (error) {
      lastError = error;
      
      // 如果是超时错误，特别处理
      if (error.name === 'AbortError') {
        console.error(`API请求超时 (${config.timeout}ms): ${url}`);
        throw new Error(`API请求超时 (${config.timeout}ms)`);
      }
      
      // 最后一次尝试失败，直接抛出错误
      if (attempt === config.retry.maxAttempts) {
        console.error(`API请求最终失败 (${attempt}/${config.retry.maxAttempts}): ${error.message}`);
        throw lastError;
      }
      
      // 等待一段时间后重试
      console.log(`API请求失败，第${attempt}次尝试，将在${delayTime}ms后重试: ${error.message}`);
      await delay(delayTime);
      
      // 指数退避策略
      delayTime = Math.min(delayTime * 2, config.retry.maxDelay);
    }
  }
}

// Notion API服务
const notionService = {
  config,
  
  // 查询数据库
  async queryDatabase(databaseId = config.defaultDatabaseId) {
    const cacheKey = `database:${databaseId}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`使用缓存的数据库查询结果: ${databaseId}`);
      return cachedData;
    }
    
    console.log(`查询数据库: ${databaseId}`);
    
    const data = await fetchWithRetry(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify({
        page_size: 100,
        sorts: [
          {
            timestamp: 'created_time',
            direction: 'descending'
          }
        ]
      })
    });
    
    cache.set(cacheKey, data);
    return data;
  },
  
  // 获取页面内容
  async getPageContent(pageId, pageSize = 10, cursor = undefined) {
    const cacheKey = `page:${pageId}:${pageSize}:${cursor || 'start'}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`使用缓存的页面内容: ${pageId}`);
      return cachedData;
    }
    
    console.log(`获取页面内容: ${pageId}`);
    
    // 获取页面信息
    const page = await fetchWithRetry(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'GET',
      headers: config.headers
    });
    
    // 获取页面块
    const blocksUrl = `https://api.notion.com/v1/blocks/${pageId}/children`;
    const queryParams = new URLSearchParams();
    
    if (pageSize) {
      queryParams.append('page_size', pageSize);
    }
    
    if (cursor) {
      queryParams.append('start_cursor', cursor);
    }
    
    const blocksResponse = await fetchWithRetry(
      `${blocksUrl}?${queryParams.toString()}`, 
      {
        method: 'GET',
        headers: config.headers
      }
    );
    
    const result = {
      page,
      blocks: blocksResponse.results,
      hasMore: blocksResponse.has_more,
      nextCursor: blocksResponse.next_cursor
    };
    
    cache.set(cacheKey, result);
    return result;
  },
  
  // 获取块的子块
  async getBlockChildren(blockId) {
    const cacheKey = `block:${blockId}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`使用缓存的块子块数据: ${blockId}`);
      return cachedData;
    }
    
    console.log(`获取块的子块: ${blockId}`);
    console.log(`块ID详情: ${blockId}, 长度: ${blockId.length}`);
    
    try {
      // 直接尝试调用Notion API
      console.log(`开始直接调用Notion API获取块子块: ${blockId}`);
      
      // 构建URL，添加分页参数
      const url = `https://api.notion.com/v1/blocks/${blockId}/children?page_size=100`;
      console.log(`请求URL: ${url}`);
      
      // 使用全新的fetch请求，避免之前可能存在的问题
      console.log('创建新的fetch请求...');
      const headers = {
        'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'User-Agent': 'Tech-Blog/1.0'
      };
      
      // 增加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn(`API请求超时: ${blockId}`);
        controller.abort();
      }, 8000); // 8秒超时，Vercel函数有10秒限制
      
      try {
        console.log(`发起API请求: GET ${url}`);
        console.log('请求头:', {
          'Notion-Version': headers['Notion-Version'],
          'Content-Type': headers['Content-Type'],
          'User-Agent': headers['User-Agent'],
          'Authorization': '已设置但不显示'
        });
        
        const startTime = Date.now();
        const response = await fetch(url, {
          method: 'GET',
          headers: headers,
          signal: controller.signal
        });
        const endTime = Date.now();
        
        clearTimeout(timeoutId);
        
        console.log(`API响应状态: ${response.status} ${response.statusText}, 耗时: ${endTime - startTime}ms`);
        console.log(`响应头: ${JSON.stringify(Object.fromEntries([...response.headers.entries()]))}`);
        
        if (!response.ok) {
          // 详细记录错误信息
          console.error(`API请求失败: ${response.status} ${response.statusText}`);
          
          let errorText = '';
          try {
            // 尝试读取JSON错误
            const errorData = await response.json();
            console.error('错误响应JSON:', errorData);
            errorText = JSON.stringify(errorData);
          } catch (e) {
            // 如果不是JSON，读取文本
            errorText = await response.text();
            console.error('错误响应文本:', errorText);
          }
          
          throw new Error(`API请求失败 (${response.status}): ${errorText}`);
        }
        
        // 成功获取数据，读取响应文本
        const responseText = await response.text();
        console.log(`API响应文本长度: ${responseText.length}`);
        console.log(`API响应文本预览: ${responseText.substring(0, 200)}...`);
        
        let data;
        try {
          data = JSON.parse(responseText);
          console.log(`JSON解析成功，数据类型: ${typeof data}`);
        } catch (jsonError) {
          console.error('JSON解析失败:', jsonError, '响应文本:', responseText.substring(0, 500));
          throw new Error(`JSON解析失败: ${jsonError.message}`);
        }
        
        // 检查响应数据
        if (!data || typeof data !== 'object') {
          console.error('无效的响应数据格式:', typeof data);
          throw new Error(`无效的响应数据格式: ${typeof data}`);
        }
        
        // 确保有results字段
        if (!data.results) {
          console.warn('响应数据缺少results字段，添加空results数组');
          data.results = [];
        }
        
        console.log(`获取到子块数据: ${data.results.length} 个子块`);
        
        // 如果是空结果，添加一个提示信息
        if (data.results.length === 0) {
          console.warn(`块 ${blockId} 没有子块，添加提示信息`);
          data.results.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: '该块没有子块或内容'
                  }
                }
              ]
            }
          });
        }
        
        // 记录第一个子块的类型
        if (data.results.length > 0) {
          console.log(`第一个子块类型: ${data.results[0]?.type || '未知'}`);
        }
        
        // 缓存数据
        cache.set(cacheKey, data);
        return data;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        console.error(`获取块子块数据失败:`, {
          error: fetchError.message,
          stack: fetchError.stack,
          name: fetchError.name
        });
        
        if (fetchError.name === 'AbortError') {
          console.error(`API请求超时`);
          throw new Error('API请求超时');
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error(`获取块子块数据失败:`, {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // 返回一个错误信息块，而不是抛出错误
      return {
        object: 'list',
        results: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: `获取数据失败: ${error.message}`
                  }
                }
              ]
            }
          }
        ],
        has_more: false
      };
    }
  },
  
  // 获取数据库信息
  async getDatabaseInfo(databaseId) {
    const cacheKey = `database-info:${databaseId}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`使用缓存的数据库信息: ${databaseId}`);
      return cachedData;
    }
    
    console.log(`获取数据库信息: ${databaseId}`);
    
    const data = await fetchWithRetry(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: config.headers
    });
    
    cache.set(cacheKey, data);
    return data;
  },
  
  // 获取所有数据库列表
  async listDatabases() {
    const cacheKey = 'databases-list';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log('使用缓存的数据库列表');
      return cachedData;
    }
    
    console.log('获取所有数据库列表');
    
    const data = await fetchWithRetry('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify({
        filter: {
          value: 'database',
          property: 'object'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      })
    });
    
    cache.set(cacheKey, data);
    return data;
  },
  
  // 清除缓存
  clearCache() {
    console.log('清除所有缓存');
    cache.clear();
  }
};

module.exports = { notionService, config }; 