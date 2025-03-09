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

export default {
    notion: {
        // 使用实际的生产环境值
        apiKey: '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',
        databaseId: '1a932af826e680df8bf7f320b51930b9'
    },
    api: {
        baseUrl: '/api'  // 生产环境中使用相对路径
    },
    debug: {
        enabled: false,
        defaultDatabaseId: '1a932af826e680df8bf7f320b51930b9'
    }
}; 