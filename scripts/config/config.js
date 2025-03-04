// 导入环境配置
import devConfig from './config.development.js';
import prodConfig from './config.production.js';

// 判断当前环境
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

// 根据环境选择配置
const config = isDevelopment ? devConfig : prodConfig;

// 添加一些通用的配置方法
const configManager = {
    ...config,
    // 获取当前环境
    getEnvironment() {
        return isDevelopment ? 'development' : 'production';
    },
    // 判断是否为开发环境
    isDevelopment() {
        return isDevelopment;
    },
    // 获取API配置
    getNotionConfig() {
        return this.notion;
    }
};

export default configManager; 