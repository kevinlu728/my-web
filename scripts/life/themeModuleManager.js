/**
 * @file themeModuleManager.js
 * @description 主题模块管理器，负责主题模块的切换和配置
 * @created 2024-05-23
 * 
 * 该模块负责:
 * 1. 主题模块的初始化和配置
 * 2. 模块之间的切换
 * 3. 模块特定样式的应用
 */

import logger from '../utils/logger.js';
import lifecycleManager from '../utils/lifecycleManager.js';
import {lifeViewManager, ModuleType} from './lifeViewManager.js';

// 主题模块管理器
class ThemeModuleManager {
    constructor() {
        this.currentModule = ModuleType.ALL;
        this.callbacks = {
            onModuleChange: null
        };
    }

    /**
     * 初始化主题模块管理器
     * @param {Object} options 配置选项
     * @param {Function} options.onModuleChange 模块切换回调函数
     */
    initialize(options = {}) {
        logger.info('初始化主题模块管理器...');
        
        // 保存回调函数
        if (typeof options.onModuleChange === 'function') {
            this.callbacks.onModuleChange = options.onModuleChange;
        }
        
        // 初始化模块样式
        this.initModuleStyles();
        
        // 初始化模块选择器UI
        this.initModuleSelectors();
        
        // 注册清理函数
        lifecycleManager.registerCleanup('themeModuleManager', this.cleanup.bind(this));
    }
    
    /**
     * 初始化模块样式
     */
    initModuleStyles() {
        // 添加模块样式类到body，用于全局主题切换
        document.body.classList.add('theme-all');
        
        // 可以在这里动态加载特定模块所需的额外资源
    }
    
    /**
     * 初始化模块选择器UI
     */
    initModuleSelectors() {
        // 查找所有模块选择器按钮并添加初始状态
        const moduleSelectors = document.querySelectorAll('.module-selector');
        
        if (moduleSelectors.length === 0) {
            logger.warn('未找到模块选择器按钮，将创建默认选择器');
            this.createDefaultModuleSelectors();
        } else {
            // 为已有的选择器添加初始激活状态
            moduleSelectors.forEach(selector => {
                const moduleType = selector.dataset.module;
                if (moduleType === this.currentModule) {
                    selector.classList.add('active');
                }
            });
        }
    }
    
    /**
     * 创建默认的模块选择器UI
     */
    createDefaultModuleSelectors() {
        // 查找或创建容器
        let moduleNav = document.querySelector('.module-nav');
        
        if (!moduleNav) {
            moduleNav = document.createElement('div');
            moduleNav.className = 'module-nav';
            
            // 尝试添加到合适的位置
            const container = document.querySelector('.life-container') || document.body;
            container.insertBefore(moduleNav, container.firstChild);
        }
        
        // 清空容器
        moduleNav.innerHTML = '';
        
        // 创建所有模块的选择器按钮
        const modules = [
            { type: ModuleType.ALL, label: '全部' },
            { type: ModuleType.MOVIE, label: '电影' },
            { type: ModuleType.FOOTBALL, label: '足球' },
            { type: ModuleType.TRAVEL, label: '旅行' },
            { type: ModuleType.FOOD, label: '美食' },
            { type: ModuleType.FAMILY, label: '家庭' }
        ];
        
        modules.forEach(module => {
            const button = document.createElement('button');
            button.className = `module-selector ${module.type === this.currentModule ? 'active' : ''}`;
            button.dataset.module = module.type;
            button.textContent = module.label;
            
            // 添加点击事件
            button.addEventListener('click', () => {
                this.changeModule(module.type);
            });
            
            moduleNav.appendChild(button);
        });
        
        logger.info('已创建默认模块选择器');
    }
    
    /**
     * 切换模块
     * @param {string} moduleType 模块类型
     */
    changeModule(moduleType) {
        if (!Object.values(ModuleType).includes(moduleType)) {
            logger.warn(`无效的模块类型: ${moduleType}`);
            return;
        }
        
        if (this.currentModule === moduleType) {
            logger.info(`已经是${moduleType}模块，跳过切换`);
            return;
        }
        
        logger.info(`切换模块: ${this.currentModule} -> ${moduleType}`);
        
        // 更新当前模块
        const prevModule = this.currentModule;
        this.currentModule = moduleType;
        
        // 更新选择器UI状态
        this.updateModuleSelectors();
        
        // 更新body主题类
        document.body.classList.remove(`theme-${prevModule}`);
        document.body.classList.add(`theme-${moduleType}`);
        
        // 触发视图模式改变事件
        lifeViewManager.dispatchViewEvent('viewModeChanged', {
            mode: moduleType,
            previousMode: prevModule
        });
        
        // 触发主题改变事件
        lifeViewManager.dispatchViewEvent('themeChanged', {
            theme: moduleType
        });
        
        // 触发回调
        if (typeof this.callbacks.onModuleChange === 'function') {
            this.callbacks.onModuleChange(moduleType);
        }
    }
    
    /**
     * 更新模块选择器UI状态
     */
    updateModuleSelectors() {
        document.querySelectorAll('.module-selector').forEach(selector => {
            const moduleType = selector.dataset.module;
            if (moduleType === this.currentModule) {
                selector.classList.add('active');
            } else {
                selector.classList.remove('active');
            }
        });
    }
    
    /**
     * 获取当前模块
     * @returns {string} 当前模块类型
     */
    getCurrentModule() {
        return this.currentModule;
    }

    /**
     * 清理函数
     */
    cleanup() {
        logger.info('清理主题模块管理器...');
        
        // 移除所有模块选择器的事件监听
        document.querySelectorAll('.module-selector').forEach(selector => {
            // 清除所有事件监听器
            const newSelector = selector.cloneNode(true);
            selector.parentNode.replaceChild(newSelector, selector);
        });
        
        // 移除主题类
        if (this.currentModule) {
            document.body.classList.remove(`theme-${this.currentModule}`);
        }
        
        // 重置状态
        this.currentModule = ModuleType.ALL;
        this.callbacks = {
            onModuleChange: null
        };
        
        logger.info('主题模块管理器已清理');
    }
}

// 创建单例实例
export const themeModuleManager = new ThemeModuleManager(); 