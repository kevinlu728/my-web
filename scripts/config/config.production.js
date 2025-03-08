// 生产环境配置
export const config = {
    notion: {
        // 生产环境的值应该在部署时由构建工具注入
        apiKey: 'PRODUCTION_API_KEY',
        databaseId: 'PRODUCTION_DATABASE_ID'
    },
    debug: {
        enabled: false,
        defaultDatabaseId: ''
    },
    imageLazyLoader: {
        enabled: true,
        threshold: 0.01,
        rootMargin: '50px'
    },
    articleManager: {
        enabled: true,
        notionDatabaseId: process.env.NOTION_DATABASE_ID || '1a932af826e680df8bf7f320b51930b9'
    }
}; 