/**
 * @file life.js
 * @description 生活频道页面入口js，是生活频道页面主控制器，负责整体页面生命周期和状态管理
 * @author 
 * @version 1.0.0
 * @created 2024-05-23
 * 
 * 该模块是生活频道应用的核心控制器，负责以下功能：
 * 1. 页面生命周期管理：初始化、加载和状态转换
 * 2. 组件协调：协调照片墙管理器和主题模块管理器
 * 3. 状态管理：通过统一的 pageState 对象管理应用状态
 * 4. 资源加载：预加载核心资源，确保页面性能
 * 5. 事件处理：初始化和处理视图事件
 * 6. 视图控制：管理不同主题模块间的转换
 * 7. 照片墙管理：统一的照片墙框架与差异化模块展示
 */

import logger from '../utils/logger.js';
import config from '../config/config.js';

import notionAPIService from '../services/notionAPIService.js';
import { resourceManager } from '../resource/resourceManager.js';
import { photoManager } from './photoManager.js';
import { themeModuleManager } from './themeModuleManager.js';
import { lifeViewManager, ModuleType, ViewMode } from './lifeViewManager.js';
import { initNavigation } from '../components/navigation.js';
import { scrollbar } from '../components/scrollbar.js';
import lifecycleManager from '../utils/lifecycleManager.js';

logger.info('🚀 life.js 开始加载...');

/**
 * 创建全局页面状态对象，统一管理页面状态
 */
window.pageState = {
    initialized: false,  // 页面是否已初始化
    initializing: false, // 页面是否正在初始化
    loading: false,      // 页面是否正在加载内容
    currentModule: ModuleType.ALL, // 当前查看的模块类型
    currentViewMode: ViewMode.GRID, // 当前视图模式
    error: null          // 出错信息
};

/**
 * 当DOM结构加载完成时执行的初始化操作
 */
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM内容已加载，开始页面加载前的准备工作...');

    // 提前设置content-unblocked事件监听器
    // setupContentUnblockedListener();

    // 立即解除内容阻塞
    // setTimeout(() => {
    //     document.dispatchEvent(new Event('content-unblocked'));
    // }, 0);

    initializePage().catch(error => {
        logger.error('❌ 初始化失败:', error);
        window.pageState.error = error;
    }).finally(() => {
        // 初始化完成，设置统一状态标志
        window.pageState.initialized = true;
        window.pageState.initializing = false;
    });
    
    // 仅在非生产环境加载调试信息
    const isProduction = config && config.getEnvironment && config.getEnvironment() === 'production';
    if (!isProduction) {
        // 将模块导出到全局作用域，方便调试
        window.photoManager = photoManager;
        window.themeModuleManager = themeModuleManager;
        window.config = config;
    } 
});

/**
 * 设置内容解锁事件监听器，确保在早期阶段就准备好
 */
function setupContentUnblockedListener() {
    logger.info('设置内容解锁事件监听器...');
    document.addEventListener('content-unblocked', () => {
        logger.info('🎉 内容已解锁，开始初始化页面');
        // 初始化页面

    }, { once: true });
}

/**
 * 初始化生活频道页面
 * @returns {Promise<void>}
 */
export async function initializePage() {
    // ===== 锁检查和初始状态设置 =====
    // 初始化生命周期管理器
    lifecycleManager.initialize('life');
    
    // 防止重复初始化 - 使用统一的状态锁
    if (window.pageState.initializing) {
        logger.info('页面正在初始化中，跳过重复初始化');
        return;
    }
    
    // 设置初始化锁
    window.pageState.initializing = true;
    
    try {
        // 检查是否已经初始化
        if (window.pageState.initialized) {
            logger.info('页面已初始化，跳过初始化过程');
            window.pageState.initializing = false; // 释放锁
            return;
        }

        // 设置状态
        window.pageState.loading = true;

        // ===== 1. 环境准备和基础设置 =====
        logger.info('初始化生活频道页面...');
        
        const lifeDatabaseId = config.notion.databaseIds?.lifePhotos || '';
        logger.info('生活频道数据库ID:', lifeDatabaseId);

        // 初始化视图管理器
        lifeViewManager.initialize('photo-wall-container');
        // 初始化视图事件
        initializeViewEvents();
        // 更新视图状态
        updateViewMode(ViewMode.LOADING);
        
        // ===== 2. 核心组件初始化 =====
        // 初始化NotionAPI服务，后续照片管理器会使用
        notionAPIService.initialize();

        // 初始化资源管理器
        resourceManager.initialize('life');

        // 初始化照片墙管理器
        await photoManager.initialize(lifeDatabaseId);
        
        // 初始化主题模块管理器，并设置模块切换回调
        initThemeModuleManager();
        
        // ===== 3. 辅助功能初始化 =====
        logger.info('✅ 页面初始化完成！开始初始化辅助功能...');

        // 初始化导航
        initNavigation();
        
        // 初始化滚动行为
        scrollbar.initialize();
        
        // 初始化模块切换事件
        initModuleChangeEvents();
        
        // ===== 5. 收尾工作 =====
        // 更新视图状态
        updateViewMode(ViewMode.GRID);

    } catch (error) {
        // 统一错误处理
        logger.error('页面初始化过程中发生错误:', error.message);
 
        // 重置状态标志
        window.pageState.loading = false;
        window.pageState.error = error;
        
        // 记录详细错误信息以便调试
        if (error.name === 'NetworkError') {
            logger.error('网络连接错误，请检查网络连接');
        } else {
            logger.error('其它类型错误:', error.message);
        }

        // 显示友好的错误提示界面
        showErrorPage(error);
    } finally {
        // 确保在所有情况下都释放锁
        window.pageState.initializing = false;
    }
}

/**
 * 初始化视图事件监听
 */
function initializeViewEvents() {
    // 如果视图管理器已初始化事件，先销毁现有事件
    if (lifeViewManager.initialized && Object.keys(lifeViewManager.eventHandlers).length > 0) {
        logger.info('检测到已有事件监听器，先清理现有事件');
        
        // 清理现有事件但不销毁管理器
        Object.keys(lifeViewManager.eventHandlers).forEach(eventName => {
            lifeViewManager.off(eventName);
        });
    }
    
    logger.info('初始化视图事件监听...');
    
    // 视图模式变更事件
    lifeViewManager.on('viewModeChanged', (event) => {
        const { mode, previousMode } = event.detail;
        logger.debug(`视图模式变更事件触发: ${previousMode || 'none'} -> ${mode}`);
        
        // 更新UI状态
        document.getElementById('photo-wall-container').dataset.viewMode = mode;
        
        // 根据模式执行特定操作
        if (mode === 'grid') {
            // 网格模式特定操作
            
        } else if (mode === 'detail') {
            // 详情模式特定操作
            // 例如：禁用滚动、聚焦详情元素等
        }
    });
    
    // 加载状态事件
    lifeViewManager.on('loadingStart', () => {
        logger.debug('加载开始事件触发');
        window.pageState.loading = true;
    });
    
    lifeViewManager.on('loadingEnd', () => {
        logger.debug('加载结束事件触发');
        window.pageState.loading = false;
    });
    
    // 渲染事件
    lifeViewManager.on('beforeRender', () => {
        logger.debug('渲染前事件触发');
        // 执行渲染前准备工作，如清除现有内容
    });
    
    lifeViewManager.on('afterRender', () => {
        logger.debug('渲染后事件触发');
        // 执行渲染后操作，如激活交互功能
    });
    
    // 主题变更事件
    lifeViewManager.on('themeChanged', (event) => {
        const { theme } = event.detail;
        logger.debug(`主题变更事件触发: ${theme}`);
        // 根据主题更新UI外观
    });
    
    // 照片交互事件
    lifeViewManager.on('photoSelected', (event) => {
        const { photoId } = event.detail;
        logger.debug(`照片选择事件触发: ${photoId}`);
        // 处理照片选择，例如显示详情视图
    });
}

/**
 * 更新视图模式
 * @param {string} mode 视图模式
 */
function updateViewMode(mode) {
    // 使用lifeViewManager获取当前模式
    const previousMode = lifeViewManager.getCurrentMode();
    
    // 通过lifeViewManager设置模式
    if (lifeViewManager.setMode(mode)) {
        // 模式已更改，同步更新页面状态
        window.pageState.currentViewMode = mode;
        
        logger.info(`视图模式变更: ${previousMode || 'none'} -> ${mode}`);
    } else {
        logger.debug(`已经是${mode}模式，跳过重复设置`);
    }

    // 根据模式更新UI状态
    const photoWallElement = document.getElementById('photo-wall-container');
    if (photoWallElement) {
        photoWallElement.dataset.viewMode = mode;
    }
}

function initThemeModuleManager() {
    themeModuleManager.initialize({
        onModuleChange: (moduleType) => {
            logger.info(`切换到模块: ${moduleType}`);
            window.pageState.currentModule = moduleType;
            photoManager.filterByModule(moduleType);
        }
    });
}

/**
 * 初始化模块切换事件
 */
function initModuleChangeEvents() {
    // 为模块切换按钮添加事件监听
    document.querySelectorAll('.module-selector').forEach(button => {
        // 创建处理函数并保存引用用于后续移除
        const handler = (e) => {
            const moduleType = e.currentTarget.dataset.module;
            if (moduleType && Object.values(ModuleType).includes(moduleType)) {
                themeModuleManager.changeModule(moduleType);
            }
        };
        
        // 保存处理函数引用
        button._moduleChangeHandler = handler;
        
        // 绑定事件
        button.addEventListener('click', handler);
    });
}

/**
 * 清理页面资源和事件监听器
 * 在页面卸载或切换到其他功能区时调用
 */
export function cleanupPage() {
    logger.info('开始清理生活频道页面资源...');
    
    try {
        // 使用生命周期管理器清理所有注册的模块
        lifecycleManager.cleanup();
        
        // 重置页面状态
        window.pageState.initialized = false;
        window.pageState.initializing = false;
        window.pageState.loading = false;
        
        logger.info('生活频道页面资源清理完成');
    } catch (error) {
        logger.error('清理页面资源时发生错误:', error);
    }
}

// 窗口加载完成后再次检查，以防动态内容改变了页面高度
window.addEventListener('load', () => {
    logger.info('页面完全加载，再次检查滚动位置...');
    scrollbar.checkInitialScrollPosition();
    
    // 定期检查返回顶部按钮是否存在并正确显示
    setTimeout(() => {
        if (!document.querySelector('.back-to-top.visible') && scrollbar.shouldShowBackToTop()) {
            logger.info('页面已滚动但返回顶部按钮未显示，强制显示按钮');
            scrollbar.toggleBackToTopButton(true);
        }
    }, 1000);
});

// 在页面卸载时执行清理
window.addEventListener('unload', () => {
    cleanupPage();
});

/**
 * 显示友好的错误提示界面
 * @param {Error} error 错误对象
 */
function showErrorPage(error) {
    logger.info('显示友好的错误提示界面');
    
    // 寻找右侧栏容器
    const rightColumn = document.querySelector('.life-content .right-column');
    if (!rightColumn) {
        logger.error('未找到右侧栏容器，无法显示错误页面');
        return;
    }
    
    // 清空右侧栏内容
    rightColumn.innerHTML = '';
    
    // 确定错误类型和消息
    let errorTitle = '数据加载失败';
    let errorMessage = '很抱歉，无法加载生活频道数据。这可能是暂时性问题，请稍后再试。';
    let errorCode = '';
    
    if (error.name === 'NetworkError' || error.message.includes('network') || error.message.includes('连接')) {
        errorTitle = '网络连接问题';
        errorMessage = '无法连接到数据服务器。请检查您的网络连接，或者稍后再试。';
        errorCode = 'NETWORK_ERROR';
    } else if (error.message.includes('权限') || error.message.includes('permission') || error.message.includes('unauthorized')) {
        errorTitle = '权限错误';
        errorMessage = '您没有访问此内容的权限。如需帮助，请联系管理员。';
        errorCode = 'PERMISSION_DENIED';
    } else if (error.message.includes('timeout') || error.message.includes('超时')) {
        errorTitle = '请求超时';
        errorMessage = '服务器响应时间过长。请稍后再试。';
        errorCode = 'REQUEST_TIMEOUT';
    } else if (error.status === 500 || error.message.includes('500')) {
        errorTitle = '服务器错误';
        errorMessage = 'Notion服务器暂时不可用。请稍后再试。';
        errorCode = 'SERVER_ERROR';
    }
    
    // 创建错误页面HTML
    const errorPageHTML = `
        <div class="error-page">
            <div class="error-icon"></div>
            <h2 class="error-title">${errorTitle}</h2>
            <p class="error-message">${errorMessage}</p>
            ${errorCode ? `<div class="error-code">${errorCode}</div>` : ''}
            <div class="error-action">
                <button class="retry-button" id="retry-button">
                    <span class="retry-button-icon"></span>
                    <span>重新加载</span>
                </button>
            </div>
        </div>
    `;
    
    // 添加错误页面到右侧栏
    rightColumn.innerHTML = errorPageHTML;
    
    // 添加重试按钮事件
    const retryButton = document.getElementById('retry-button');
    if (retryButton) {
        retryButton.addEventListener('click', () => {
            logger.info('用户点击重试按钮，重新初始化页面');
            // 清空错误状态
            window.pageState.error = null;
            // 显示加载提示
            rightColumn.innerHTML = '<div class="loading-container" style="text-align: center; padding: 100px 0;"><div class="loading-spinner"></div><div class="loading-text">正在重新加载...</div></div>';
            // 延迟一点以显示加载提示
            setTimeout(() => {
                // 重新初始化页面
                initializePage();
            }, 500);
        });
    }
}
