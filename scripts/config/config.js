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