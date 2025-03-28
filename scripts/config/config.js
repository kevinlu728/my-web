/**
 * @file config.js
 * @description 配置管理模块，负责加载和提供应用配置
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-04
 * 
 * 该模块负责管理应用的配置信息：
 * - 根据环境（开发/生产）加载不同的配置
 * - 提供统一的配置访问接口
 * - 管理API端点、密钥等敏感信息
 * - 提供功能开关和参数配置
 * 
 * 配置项包括：
 * - API相关配置（baseUrl, apiKey等）
 * - 功能开关（enableDebug, enableCache等）
 * - 性能参数（cacheTimeout, maxRetries等）
 * - UI配置（theme, animations等）
 * 
 * 该模块导出单个配置对象，可被其他模块导入使用。
 */

// 导入生产环境配置 - 只静态导入生产环境配置
import prodConfig from './config.production.js';
// 导入logger模块
import logger from '../utils/logger.js';

// 判断当前环境
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

// 根据环境动态选择配置
let config;

// 这里使用异步初始化配置的函数
async function initConfig() {
    try {
        if (isDevelopment) {
            // 开发环境：尝试动态导入开发配置
            try {
                const devConfigModule = await import('./config.development.js');
                config = devConfigModule.default;
                console.log('已加载开发环境配置');
            } catch (err) {
                console.warn('无法加载开发环境配置，使用生产环境配置:', err.message);
                config = prodConfig;
            }
        } else {
            // 生产环境：直接使用生产配置
            config = prodConfig;
            console.log('已加载生产环境配置');
        }
        
        // 更新logger配置
        logger.updateConfig(configManager);
    } catch (err) {
        console.error('配置初始化失败:', err);
        // 出错时使用生产配置作为后备
        config = prodConfig;
    }
}

// 添加一些通用的配置方法
const configManager = {
    // 使用代理获取最新配置
    get notion() { return config?.notion || prodConfig.notion; },
    get api() { return config?.api || prodConfig.api; }, 
    get debug() { return config?.debug || prodConfig.debug; },
    get logging() { return config?.logging || prodConfig.logging; },
    
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

// 立即初始化配置
initConfig();

export default configManager; 