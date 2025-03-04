// 生产环境配置
export default {
    notion: {
        // 生产环境的值应该在部署时由构建工具注入
        apiKey: 'PRODUCTION_API_KEY',
        databaseId: 'PRODUCTION_DATABASE_ID'
    },
    debug: {
        enabled: false,
        defaultDatabaseId: ''
    }
}; 