/**
 * @file api-service.js
 * @description 前端API服务客户端，负责前端应用与后端API之间的通信
 *              支持标准API和直接API两种实现方式，具有自动重试和API实现切换功能
 * @author 陆凯
 * @version 1.1.0
 * @created 2024-03-15
 * @updated 2024-06-28
 */

// 传统方式获取 logger，确保在HTML中先加载了logger.js
const logger = window.loggerModule || console;

// 调试信息：验证logger对象
if (logger === console) {
  console.warn('⚠️ ApiService: 未找到logger模块，使用console作为回退');
} else {
  logger.info('✅ ApiService: 成功获取logger模块');
}

/**
 * 创建API服务实例
 * 该服务是前端与后端API之间的桥梁，提供统一的接口访问方式
 * 支持自动选择最佳API实现方式并在出错时进行切换
 */
class ApiService {
  constructor() {
    this.baseUrl = '';
    this.directApiBaseUrl = '';
    this.useDirectApi = false;
    this.initializeBaseUrl();
    this.lastError = null;
    this.connectionStatus = 'unknown'; // 'online', 'offline', 'unknown'
    this.retryCount = 0;
    this.maxRetries = 2;
  }

  /**
   * 初始化API基础URL
   */
  initializeBaseUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // 本地开发环境
      this.baseUrl = 'http://127.0.0.1:8000/api';
      this.directApiBaseUrl = 'http://127.0.0.1:8000/api';
    } else {
      // 生产环境 - Vercel
      this.baseUrl = '/api';
      this.directApiBaseUrl = '/api';
    }
    logger.info('API基础URL:', this.baseUrl);
  }

  /**
   * 切换到直接API实现
   */
  enableDirectApi() {
    this.useDirectApi = true;
    logger.info('已启用直接API实现');
    return this;
  }

  /**
   * 切换到标准API实现
   */
  enableStandardApi() {
    this.useDirectApi = false;
    logger.info('已启用标准API实现');
    return this;
  }

  /**
   * 获取适用的API基础URL
   */
  getActiveBaseUrl() {
    return this.useDirectApi ? this.directApiBaseUrl : this.baseUrl;
  }

  /**
   * 测试API连接
   * 检查后端API服务是否可用，获取API状态信息
   * 是所有其他API方法的基础，如果此方法成功则表示API服务可用
   * @returns {Promise<Object>} 包含成功状态和API信息的对象
   */
  async testConnection() {
    try {
      const endpoint = this.useDirectApi ? `${this.directApiBaseUrl}/status` : `${this.baseUrl}/status`;
      logger.info(`测试API连接: ${endpoint}`);
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`API状态检查失败: ${response.status}`);
      }
      
      const data = await response.json();
      logger.info('API连接测试结果:', data);
      
      this.connectionStatus = 'online';
      return {
        success: true,
        data,
        implementation: this.useDirectApi ? 'direct' : 'standard'
      };
    } catch (error) {
      logger.error('API连接测试失败:', error);
      this.connectionStatus = 'offline';
      this.lastError = error;
      
      return {
        success: false,
        error: error.message,
        implementation: this.useDirectApi ? 'direct' : 'standard'
      };
    }
  }

  /**
   * 自动尝试所有可用的API实现
   */
  async autoSelectBestApi() {
    // 首先尝试标准API
    this.enableStandardApi();
    const standardTest = await this.testConnection();
    
    if (standardTest.success) {
      logger.info('标准API测试成功，将使用标准API');
      return {
        success: true,
        selectedImplementation: 'standard',
        result: standardTest
      };
    }
    
    // 如果标准API失败，尝试直接API
    logger.info('标准API测试失败，尝试使用直接API');
    this.enableDirectApi();
    const directTest = await this.testConnection();
    
    if (directTest.success) {
      logger.info('直接API测试成功，将使用直接API');
      return {
        success: true,
        selectedImplementation: 'direct',
        result: directTest
      };
    }
    
    // 如果两种实现都失败
    logger.error('所有API实现都无法连接');
    // 默认回到标准API
    this.enableStandardApi();
    return {
      success: false,
      selectedImplementation: 'standard',
      standardResult: standardTest,
      directResult: directTest
    };
  }

  /**
   * 执行API请求，支持自动重试和API实现切换
   */
  async executeRequest(url, options = {}, allowFallback = true) {
    const fullUrl = `${this.getActiveBaseUrl()}${url}`;
    logger.info(`执行API请求: ${options.method || 'GET'} ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败: ${response.status} - ${errorText}`);
      }
      
      this.retryCount = 0; // 重置重试计数器
      this.connectionStatus = 'online';
      return await response.json();
    } catch (error) {
      logger.error(`API请求失败: ${fullUrl}`, error);
      this.lastError = error;
      
      // 如果允许回退且还有重试次数
      if (allowFallback && this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.info(`尝试切换API实现并重试 (${this.retryCount}/${this.maxRetries})`);
        
        // 切换API实现
        this.useDirectApi = !this.useDirectApi;
        logger.info(`已切换到${this.useDirectApi ? '直接' : '标准'}API实现`);
        
        // 递归调用，但不增加重试计数
        return await this.executeRequest(url, options, true);
      }
      
      // 如果已达到最大重试次数或不允许回退
      this.connectionStatus = 'offline';
      throw error; // 重新抛出错误供调用者处理
    }
  }

  /**
   * 获取文章列表
   */
  async getArticles(params = {}) {
    const { filter, sorts, limit, pageSize, startCursor } = params;
    
    const requestBody = {
      filter,
      sorts,
      limit,
      pageSize: pageSize || 100,
      startCursor
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    };
    
    try {
      const endpoint = this.useDirectApi ? '/articles' : '/articles';
      return await this.executeRequest(endpoint, options);
    } catch (error) {
      logger.error('获取文章列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取文章内容
   */
  async getArticleContent(pageId) {
    if (!pageId) {
      throw new Error('缺少文章ID');
    }
    
    try {
      const endpoint = this.useDirectApi 
        ? `/article-content/${encodeURIComponent(pageId)}` 
        : `/article-content/${encodeURIComponent(pageId)}`;
      
      return await this.executeRequest(endpoint);
    } catch (error) {
      logger.error('获取文章内容失败:', error);
      throw error;
    }
  }

  /**
   * 获取块内容
   */
  async getBlockChildren(blockId) {
    if (!blockId) {
      throw new Error('缺少块ID');
    }
    
    try {
      const endpoint = this.useDirectApi
        ? `/blocks/${encodeURIComponent(blockId)}/children`
        : `/blocks/${encodeURIComponent(blockId)}/children`;
      
      return await this.executeRequest(endpoint);
    } catch (error) {
      logger.error('获取块内容失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据库信息
   * @param {string} databaseId - 数据库ID
   * @returns {Promise<Object>} 数据库信息
   */
  async getDatabaseInfo(databaseId) {
    if (!databaseId) {
      return { success: false, error: '缺少数据库ID' };
    }
    
    try {
      logger.info(`获取数据库信息: ${databaseId}`);
      const endpoint = `/database-info`;
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ database_id: databaseId })
      };
      
      return await this.executeRequest(endpoint, options);
    } catch (error) {
      logger.error('获取数据库信息失败:', error);
      return { 
        success: false, 
        error: `获取数据库信息失败: ${error.message}` 
      };
    }
  }
  
  /**
   * 获取所有数据库列表
   * @returns {Promise<Object>} 数据库列表
   */
  async getDatabases() {
    try {
      logger.info('获取所有数据库列表');
      const endpoint = `/databases`;
      
      return await this.executeRequest(endpoint);
    } catch (error) {
      logger.error('获取数据库列表失败:', error);
      return { 
        success: false, 
        error: `获取数据库列表失败: ${error.message}` 
      };
    }
  }
}

// 创建API服务实例
const apiService = new ApiService();

// 初始化时自动选择最佳API实现
(async function initApiService() {
  try {
    const result = await apiService.autoSelectBestApi();
    logger.info('API服务初始化完成，使用', result.selectedImplementation, '实现');
  } catch (error) {
    logger.error('API服务初始化失败:', error);
  }
})();

// 导出API服务实例
window.apiService = apiService; 