/**
 * @file config.production.js
 * @description 生产环境配置，提供生产环境特定的配置参数
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-08
 * 
 * 该模块提供生产环境特定的配置参数：
 * - 生产服务器URL和CDN配置
 * - 生产环境API端点
 * - 性能优化相关配置
 * - 错误跟踪和分析配置
 * 
 * 这些配置在生产环境中被config.js加载，不会影响开发环境。
 * 生产配置注重性能和安全性，禁用了开发环境中的调试功能。
 * 
 * 该模块导出配置对象，被config.js模块导入使用。
 */

// 导入默认AI配置
import defaultAIConfig from './aiConfig.js';

export default {
    logging: {
        level: 'INFO',  // 生产环境使用INFO级别
        useColors: false,
        showTimestamp: true,
        showCaller: false
    },
    api: {
        baseUrl: '/api' // 使用相对路径，指向Vercel的API函数
    },
    // Notion配置
    notion: {
        // 在生产环境中，我们不直接在前端使用API密钥，而是通过后端API调用
        apiKey: '', // 前端不需要直接使用API密钥
        databaseId: '1a932af826e680df8bf7f320b51930b9', // 默认数据库ID
        databaseIds:{
            blogArticles: '1a932af826e680df8bf7f320b51930b9',
            lifePhotos: '1d732af826e680a7919fe3b5a88c6a5f'
        }
    },
    // AI服务配置 - 生产环境
    ai: {
        ...defaultAIConfig,  // 使用默认配置作为基础
        // 生产环境中API密钥应该从环境变量中读取，或通过安全的后端API获取
        apiKeys: {
            // 生产环境下不直接暴露API密钥
            // 实际项目中这里应该为空，使用环境变量或安全存储
            deepseek: 'sk-694fc5828b714a7199f025fb8ab539e2',
            openai: '',
            claude: ''
        },
        // 生产环境中禁用调试功能
        debug: {
            logMessages: false,
            mockResponses: false,
            responsesDelay: 0
        },
        // 生产环境优化
        performance: {
            cacheResponses: true,     // 缓存常见问题的回复
            cacheLifetime: 86400000,  // 缓存有效期24小时
            useCompression: true      // 使用压缩
        }
    },
    debug: {
        enabled: false,
        defaultDatabaseId: '1a932af826e680df8bf7f320b51930b9'
    }
}; 