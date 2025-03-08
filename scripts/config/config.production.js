// 生产环境配置
export const config = {
    notion: {
        databaseId: '1a932af826e680df8bf7f320b51930b9'  // 直接使用固定值
    },
    debug: {
        enabled: false,
        defaultDatabaseId: '1a932af826e680df8bf7f320b51930b9'
    },
    imageLazyLoader: {
        enabled: true,
        threshold: 0.01,
        rootMargin: '50px'
    },
    articleManager: {
        enabled: true,
        notionDatabaseId: '1a932af826e680df8bf7f320b51930b9'  // 直接使用固定值
    }
}; 