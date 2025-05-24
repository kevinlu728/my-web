/**
 * @file notionAPIService.js
 * @description Notion API服务模块，负责与API交互获取数据
 *              支持标准API和直接API两种实现方式，具有自动重试和API实现切换功能
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-07-12
 * 
 * 该模块整合了api-service.js和notionService.js的功能:
 * - 采用api-service.js的类结构和API切换/重试机制
 * - 融入notionService.js的详细日志、错误处理和响应验证
 * - 统一接口参数和返回结构，确保一致性
 */

// 尝试获取logger，如果未初始化则使用console作为回退
const logger = window.loggerModule || console;
const LIMIT = 100;
const DEFAULT_PAGE_SIZE = 10;

/**
 * Notion API服务类
 * 提供与Notion数据库交互的完整API实现
 */
class NotionAPIService {
    constructor() {
        this.baseUrl = '';
        this.directApiBaseUrl = '';
        this.useDirectApi = false;
        this.lastError = null;
        this.connectionStatus = 'unknown'; // 'online', 'offline', 'unknown'
        this.retryCount = 0;
        this.maxRetries = 2;
    }

    async initialize() {
        // 调试信息：验证logger对象
        if (logger === console) {
            console.warn('⚠️ 未找到logger模块，使用console作为回退');
        } else {
            logger.info('✅ 成功获取logger模块');
        }
        this.logInfo('初始化NotionAPIService...');
        this.initBaseUrl();

        // 为了提升页面加载速度，暂时关闭自动选择最佳API实现。
        // try {
        //     const result = await this.autoSelectBestApi();
        //     console.info('[NotionAPIService] API服务初始化完成，使用', result.selectedImplementation, '实现');
        //     logger.info('[NotionAPIService] API服务初始化完成，使用', result.selectedImplementation, '实现');
        // } catch (error) {
        //     console.error('[NotionAPIService] API服务初始化失败:', error);
        //     logger.error('[NotionAPIService] API服务初始化失败:', error);
        // }
    }

    /**
     * 初始化API基础URL
     */
    initBaseUrl() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // 本地开发环境
        this.baseUrl = 'http://127.0.0.1:8000/api';
        this.directApiBaseUrl = 'http://127.0.0.1:8000/api';
        } else {
        // 生产环境 - Vercel
        this.baseUrl = '/api';
        this.directApiBaseUrl = '/api';
        }
        this.logInfo('API基础URL初始化完成:', this.baseUrl);
    }

    /**
     * 自动尝试所有可用的API实现
     */
    async autoSelectBestApi() {
        // 首先尝试标准API
        this.enableStandardApi();
        const standardTest = await this.testConnection();
        
        if (standardTest.success) {
        this.logInfo('标准API测试成功，将使用标准API');
        return {
            success: true,
            selectedImplementation: 'standard',
            result: standardTest
        };
        }
        
        // 如果标准API失败，尝试直接API
        this.logInfo('标准API测试失败，尝试使用直接API');
        this.enableDirectApi();
        const directTest = await this.testConnection();
        
        if (directTest.success) {
        this.logInfo('直接API测试成功，将使用直接API');
        return {
            success: true,
            selectedImplementation: 'direct',
            result: directTest
        };
        }
        
        // 如果两种实现都失败
        this.logError('所有API实现都无法连接');
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
     * 测试API连接
     * 检查后端API服务是否可用，获取API状态信息
     * @returns {Promise<Object>} 包含成功状态和API信息的对象
     */
    async testConnection() {
        try {
        const endpoint = this.useDirectApi ? `${this.directApiBaseUrl}/status` : `${this.baseUrl}/status`;
        this.logInfo(`测试API连接: ${endpoint}`);
        
        const response = await fetch(endpoint);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API状态检查失败: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        this.logInfo('API连接测试结果:', data);
        
        this.connectionStatus = 'online';
        return {
            success: true,
            data,
            implementation: this.useDirectApi ? 'direct' : 'standard'
        };
        } catch (error) {
        this.logError('API连接测试失败:', error);
        this.connectionStatus = 'offline';
        this.lastError = error;
        
        // 详细记录异常堆栈
        this.logError('错误堆栈:', error.stack);
        this.logError('错误发生时间:', new Date().toISOString());
        
        return {
            success: false,
            error: error.message,
            implementation: this.useDirectApi ? 'direct' : 'standard'
        };
        }
    }

    /**
     * 切换到直接API实现
     */
    enableDirectApi() {
        this.useDirectApi = true;
        this.logInfo('已启用直接API实现');
        return this;
    }

    /**
     * 切换到标准API实现
     */
    enableStandardApi() {
        this.useDirectApi = false;
        this.logInfo('已启用标准API实现');
        return this;
    }

    /**
     * 获取适用的API基础URL
     */
    getActiveBaseUrl() {
        return this.useDirectApi ? this.directApiBaseUrl : this.baseUrl;
    }

    /**
     * 获取所有数据库列表
     * @returns {Promise<Object>} 数据库列表
     */
    async getDatabases() {
        try {
        this.logInfo('获取所有数据库列表');
        const endpoint = `/databases`;
        
        return await this.executeRequest(endpoint);
        } catch (error) {
        this.logError('获取数据库列表失败:', error);
        return { 
            success: false, 
            error: `获取数据库列表失败: ${error.message}` 
        };
        }
    }

    /**
     * 获取单个数据库的信息
     * @param {string} databaseId - 数据库ID
     * @returns {Promise<Object>} 数据库信息
     */
    async getDatabaseInfo(databaseId) {
        try {
        this.logInfo(`获取数据库信息，数据库ID: ${databaseId}`);
        
        if (!databaseId) {
            this.logError('缺少数据库ID');
            return { success: false, error: '缺少数据库ID' };
        }
        
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
        this.logError('获取数据库信息失败:', error);
        return { 
            success: false, 
            error: `获取数据库信息失败: ${error.message}` 
        };
        }
    }

    /**
     * 获取文章列表
     * 兼容notionService的参数格式和返回结构
     * @param {Object|string} params - 参数对象或数据库ID
     * @returns {Promise<Object>} 文章列表和分页信息
     */
    async getArticles(params) {
        try {
        let databaseId = null;
        let requestBody = {};

        // 兼容两种调用方式：
        // 1. getArticles(databaseId)
        // 2. getArticles({ filter, sorts, limit, pageSize, startCursor })
        if (typeof params === 'string') {
            databaseId = params;
            this.logInfo(`获取文章列表，数据库ID: ${databaseId}`);
            requestBody = {
            database_id: databaseId,
            databaseId: databaseId,  // 兼容两种参数格式
            limit: LIMIT
            };
        } else {
            const { filter, sorts, limit, pageSize, startCursor, database_id, databaseId } = params || {};
            this.logInfo(`获取文章列表，参数:`, params);
            requestBody = {
            filter,
            sorts,
            limit,
            pageSize: pageSize || LIMIT,
            startCursor,
            database_id: database_id || databaseId,
            databaseId: databaseId || database_id
            };
        }
        
        // 记录请求参数
        this.logInfo('请求参数:', requestBody);
        
        const options = {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        };
        
        const endpoint = '/articles';
        const data = await this.executeRequest(endpoint, options);
        
        // 检查响应结构并记录
        const responseStructure = {
            hasResults: !!data.results,
            resultsLength: data.results?.length,
            hasArticles: !!data.articles,
            articlesLength: data.articles?.length,
            hasMore: !!data.hasMore || !!data.has_more,
            nextCursor: data.nextCursor || data.next_cursor
        };
        this.logInfo('响应结构检查:', responseStructure);
        
        // 检查数据结构
        if (!data.results && !data.articles) {
            this.logError('无效的API响应格式 - 缺少结果:', data);
            throw new Error('无效的API响应格式 - 缺少文章数据');
        }
        
        // 兼容两种返回格式
        const articles = data.articles || data.results;
        
        if (!Array.isArray(articles)) {
            this.logError('无效的文章数据 - 不是数组:', articles);
            throw new Error('无效的API响应格式 - 文章不是数组');
        }
        
        // 返回文章列表，分页信息和源数据
        return {
            articles,
            hasMore: data.hasMore || data.has_more || false,
            nextCursor: data.nextCursor || data.next_cursor || null,
            raw: data
        };
        } catch (error) {
        this.logError('获取文章列表失败:', error);
        // 详细记录异常堆栈
        this.logError('错误堆栈:', error.stack);
        this.logError('错误发生时间:', new Date().toISOString());
        throw error;
        }
    }

    /**
     * 获取文章内容
     * @param {string} pageId - 文章ID
     * @returns {Promise<Object>} 文章内容
     */
    async getArticleContent(pageId) {
        try {
        this.logInfo(`获取文章内容，页面ID: ${pageId}`);
        
        // 重要：检查pageId是否有效，无效时不请求API
        if (!pageId || pageId === 'undefined' || pageId === 'null') {
            this.logError('无效的页面ID:', pageId);
            throw new Error('提供了无效的页面ID');
        }
        
        const endpoint = `/article-content/${encodeURIComponent(pageId)}`;
        const data = await this.executeRequest(endpoint);
        
        this.logDebug('获取到文章内容:', data);
        
        // 确保返回的数据结构符合预期
        if (!data.page || !data.blocks) {
            this.logError('无效的文章内容格式:', data);
            throw new Error('无效的文章内容格式');
        }
        
        return {
            page: data.page,
            blocks: data.blocks,
            hasMore: data.hasMore || false,
            nextCursor: data.nextCursor || null
        };
        } catch (error) {
        this.logError('获取文章内容失败:', error);
        this.logError('错误堆栈:', error.stack);
        throw error;
        }
    }

    /**
     * 获取块内容
     * @param {string} blockId - 块ID
     * @returns {Promise<Object>} 块内容
     */
    async getBlockChildren(blockId) {
        try {
        this.logInfo(`获取块内容，块ID: ${blockId}`);
        
        if (!blockId) {
            this.logError('缺少块ID');
            throw new Error('缺少块ID');
        }
        
        const endpoint = `/blocks/${encodeURIComponent(blockId)}/children`;
        return await this.executeRequest(endpoint);
        } catch (error) {
        this.logError('获取块内容失败:', error);
        throw error;
        }
    }

    /**
     * 获取照片列表
     * @param {Object|string} params - 参数对象或数据库ID
     * @returns {Promise<Object>} 照片列表和分页信息
     */
    async getPhotos(params) {
        try {
        let databaseId = null;
        let requestBody = {};
        
        // 兼容两种调用方式：
        // 1. getPhotos(databaseId)
        // 2. getPhotos({ filter, sorts, limit, pageSize, startCursor })
        if (typeof params === 'string') {
            databaseId = params;
            this.logInfo(`获取照片列表，数据库ID: ${databaseId}`);
            requestBody = {
            lifeDatabaseId: databaseId,
            databaseId: databaseId,  // 兼容两种参数格式
            limit: LIMIT
            };
        } else {
            const { filter, sorts, limit, pageSize, startCursor, lifeDatabaseId, databaseId } = params || {};
            this.logInfo(`获取照片列表，参数:`, params);
            requestBody = {
            filter,
            sorts,
            limit,
            pageSize: pageSize || LIMIT,
            startCursor,
            lifeDatabaseId: lifeDatabaseId || databaseId,
            databaseId: databaseId || lifeDatabaseId
            };
        }
        
        // 记录请求参数
        this.logInfo('请求参数:', requestBody);
        
        const options = {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        };
        
        const endpoint = '/photos';
        const data = await this.executeRequest(endpoint, options);
        
        // 检查响应结构并记录
        const responseStructure = {
            hasResults: !!data.results,
            resultsLength: data.results?.length,
            hasPhotos: !!data.photos,
            photosLength: data.photos?.length,
            hasMore: !!data.hasMore || !!data.has_more,
            nextCursor: data.nextCursor || data.next_cursor
        };
        this.logInfo('响应结构检查:', responseStructure);
        
        // 检查数据结构
        if (!data.results && !data.photos) {
            this.logError('无效的API响应格式 - 缺少结果:', data);
            throw new Error('无效的API响应格式 - 缺少照片数据');
        }
        
        // 兼容两种返回格式
        const photos = data.photos || data.results;
        
        if (!Array.isArray(photos)) {
            this.logError('无效的照片数据 - 不是数组:', photos);
            throw new Error('无效的API响应格式 - 照片不是数组');
        }
        
        // 返回照片列表，分页信息和源数据
        return {
            photos,
            hasMore: data.hasMore || data.has_more || false,
            nextCursor: data.nextCursor || data.next_cursor || null,
            raw: data
        };
        } catch (error) {
        this.logError('获取照片列表失败:', error.message);
        // 详细记录异常堆栈
        this.logError('错误堆栈:', error.stack);
        this.logError('错误发生时间:', new Date().toISOString());
        throw error;
        }
    }

    /**
     * 执行API请求，支持自动重试和API实现切换
     */
    async executeRequest(url, options = {}, allowFallback = true) {
        const fullUrl = `${this.getActiveBaseUrl()}${url}`;
        this.logInfo(`执行API请求: ${options.method || 'GET'} ${fullUrl}`);
        
        // 记录请求参数
        if (options.body) {
        this.logDebug('请求参数:', JSON.parse(options.body));
        }
        
        try {
        const response = await fetch(fullUrl, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            // 详细记录错误信息
            this.logError('API请求失败:', {
            method: options.method || 'GET',
            url: fullUrl,
            params: options.body ? JSON.parse(options.body) : {},
            statusCode: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries([...response.headers]),
            responseText: errorText
            });
            throw new Error(`API请求失败: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        this.logDebug('API响应数据:', data);
        
        this.retryCount = 0; // 重置重试计数器
        this.connectionStatus = 'online';
        return data;
        } catch (error) {
        this.logError(`API请求失败: ${fullUrl}`, error.message);
        this.lastError = error;
        
        // 如果允许回退且还有重试次数
        if (allowFallback && this.retryCount < this.maxRetries) {
            this.retryCount++;
            this.logInfo(`尝试切换API实现并重试 (${this.retryCount}/${this.maxRetries})`);
            
            // 切换API实现
            this.useDirectApi = !this.useDirectApi;
            this.logInfo(`已切换到${this.useDirectApi ? '直接' : '标准'}API实现`);
            
            // 递归调用，但不增加重试计数
            return await this.executeRequest(url, options, true);
        }
        
        // 如果已达到最大重试次数或不允许回退
        this.connectionStatus = 'offline';
        throw error; // 重新抛出错误供调用者处理
        }
    }

    /**
     * 增强型日志记录 - 同时使用console和logger
     */
    logInfo(message, ...args) {
        if (logger === console) {
        console.info(`[NotionAPIService] ${message}`, ...args);
        } else {
        logger.info(`[NotionAPIService] ${message}`, ...args);
        }
    }

    logError(message, ...args) {
        if (logger === console) {
        console.error(`[NotionAPIService] ${message}`, ...args);
        } else {
        logger.error(`[NotionAPIService] ${message}`, ...args);
        }
    }

    logDebug(message, ...args) {
        if (logger === console) {
        console.debug(`[NotionAPIService] ${message}`, ...args);
        } else {
        logger.debug(`[NotionAPIService] ${message}`, ...args);
        }
    }
}

// 创建API服务实例
const notionAPIService = new NotionAPIService();

// 导出API服务实例和类
window.notionAPIService = notionAPIService;  // 用于调试面板
// ES模块导出，兼容 import 方式
export default notionAPIService;
