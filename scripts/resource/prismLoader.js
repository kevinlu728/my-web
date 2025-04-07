/**
 * @file prism-loader.js
 * @description Prism代码高亮加载器 - 从resource-loader中提取的专门处理Prism加载的模块
 * @version 1.0.0
 */

// 导入必要的依赖
import logger from '../utils/logger.js';
import resourceConfig from '../config/resources.js';
import { styleResourceLoader } from './styleResourceLoader.js';

/**
 * Prism代码高亮加载器类
 */
export class PrismLoader {

}

// 创建并导出单例实例
const prismLoader = new PrismLoader();
export default prismLoader;