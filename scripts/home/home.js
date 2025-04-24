/**
 * @file home.js
 * @description 主页入口文件，负责所有组件的加载与初始化
 * @author 陆凯
 * @version 1.1.0
 * @created 2024-03-09
 * @updated 2024-07-12
 * 
 * 该文件是网站主页的控制中心，负责协调页面生命周期和组件管理：
 * 1. 资源加载：预加载页面所需的关键资源
 * 2. HTML组件加载：动态加载HTML片段组件（社交链接、联系模态框、聊天窗口）
 * 3. JS组件初始化：初始化各种交互功能组件（导航、滚动条、粒子背景等）
 * 4. 事件监听器设置：为HTML组件挂载事件处理器
 * 
 * 页面加载流程：
 * - DOM加载完成后触发初始化
 * - 通过resourceManager加载关键资源
 * - 按顺序加载HTML组件 → 初始化JS组件 → 设置事件监听器
 * - 各组件采用模块化设计，通过import导入，职责单一
 * 
 */

import logger from '../utils/logger.js';
import { resourceManager } from '../resource/resourceManager.js';
import { initNavigation } from '../components/navigation.js';
import { scrollbar } from '../components/scrollbar.js';
import { initChatWidget } from '../components/chatWidget.js';
import { initContactModals } from '../components/contactModals.js';
import { particleBackground } from '../components/particleBackground.js';

logger.info('🚀 home.js 开始加载...');

// 当DOM加载完成后初始化所有组件
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM内容已加载，开始页面加载前的准备工作...');

    initializePage().catch(error => {
        logger.error('❌ 初始化失败:', error);
    });
});

/**
 * 初始化主页
 * @returns {Promise<void>}
 */
async function initializePage() {
    logger.info('初始化主页...');

    try {
        // 初始化资源管理器
        resourceManager.initialize();

        // 加载HTML UI组件
        await loadHtmlComponents();

        // 初始化JavaScript功能组件
        initJsComponents();

        // 为HTML组件初始化事件监听器
        initHtmlComponentEvents();

        logger.debug('🎉 所有组件初始化完成！');
    } catch (error) {
        logger.error('❌ 主页初始化失败:', error.message);
    }
}

/**
 * 加载所有HTML UI组件
 * @returns {Promise<void>}
 */
async function loadHtmlComponents() {
    logger.debug('加载HTML UI组件...');
    
    // 加载所有组件
    const results = await Promise.allSettled([
        loadHtmlComponent('social-links-container', './components/social-links.html'),
        loadHtmlComponent('contact-modal-container', './components/contact-modal.html'),
        loadHtmlComponent('chat-widget-container', './components/chat-widget.html')
    ]);
    
    // 检查结果
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
        logger.warn(`⚠️ ${failed}个HTML组件加载失败`);
    }
    
    logger.info(`HTML UI组件加载完成 (成功: ${results.length - failed}, 失败: ${failed})`);
}

/**
 * 加载单个HTML UI组件
 * @param {string} containerId - 组件容器的ID
 * @param {string} componentPath - 组件HTML文件的路径
 * @returns {Promise<void>}
 */
async function loadHtmlComponent(containerId, componentPath) {
    try {
        const container = document.getElementById(containerId);
        if (!container) {
            logger.warn(`⚠️ 容器 ${containerId} 不存在，跳过加载组件 ${componentPath}`);
            return;
        }
        
        logger.debug(`加载HTML组件: ${componentPath} 到 ${containerId}`);
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`加载失败: ${response.status} ${response.statusText}`);
        }
        const html = await response.text();
        container.innerHTML = html;
        // logger.info(`✅ 成功加载HTML组件: ${componentPath}`);
    } catch (error) {
        logger.error(`❌ 加载组件失败 ${componentPath}:`, error);
    }
}

/**
 * 初始化JavaScript功能组件
 * 这些组件提供网站的交互功能
 */
function initJsComponents() {
    logger.debug('初始化JavaScript功能组件...');
    
    try {
        // 初始化导航菜单
        initNavigation();

        // 初始化滚动条
        scrollbar.initialize();

        // 初始化聊天组件
        initChatWidget();

        // 初始化联系方式弹窗
        initContactModals();

        // 初始化粒子背景
        particleBackground.initialize();

        logger.info('✅ 所有JavaScript功能组件初始化完成');
    } catch (error) {
        logger.error('页面初始化过程中发生错误:', error.message);
    }
}
    
/**
 * 为加载的HTML组件初始化事件监听器
 */
function initHtmlComponentEvents() {
    logger.debug('初始化HTML组件事件监听器...');
    
    try {
        // 初始化社交链接组件事件
        initSocialLinksEvents();

        // 初始化联系模态框组件事件
        initContactModalEvents();

        // 初始化聊天窗口组件事件
        initChatWidgetEvents();

        logger.info('✅ 所有HTML组件事件监听器初始化完成');
    } catch (error) {
        logger.error('❌ 初始化HTML组件事件监听器失败:', error.message);
    }
    
}
    
/**
 * 初始化社交链接组件的事件监听器
 */
function initSocialLinksEvents() {
    const socialLinks = document.querySelectorAll('.social-link');
    if (socialLinks.length === 0) {
        logger.warn('⚠️ 未找到社交链接元素，无法绑定事件');
        return;
    }
    
    socialLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const platform = link.getAttribute('data-platform');
            logger.debug(`点击了社交链接: ${platform}`);
            // 可以添加分析跟踪或其他功能
        });
    });
    
    // logger.info(`✅ 已为${socialLinks.length}个社交链接绑定事件`);
}
    
/**
 * 初始化联系模态框组件的事件监听器
 */
function initContactModalEvents() {
    const wechatLink = document.getElementById('wechat-link');
    const wechatModal = document.getElementById('wechat-modal');
    const contactCloseBtn = document.querySelector('.contact-modal .close-btn');
    
    if (!wechatLink) {
        logger.warn('⚠️ 未找到微信链接元素 (#wechat-link)');
    }
    
    if (!wechatModal) {
        logger.warn('⚠️ 未找到微信模态框元素 (#wechat-modal)');
    }
    
    if (wechatLink && wechatModal) {
        wechatLink.addEventListener('click', () => {
            wechatModal.style.display = 'flex';
            logger.debug('打开微信二维码模态框');
        });
        
        if (contactCloseBtn) {
            contactCloseBtn.addEventListener('click', () => {
                wechatModal.style.display = 'none';
                logger.debug('关闭微信二维码模态框');
            });
        } else {
            logger.warn('⚠️ 未找到模态框关闭按钮');
        }
        
        wechatModal.addEventListener('click', (e) => {
            if (e.target === wechatModal) {
                wechatModal.style.display = 'none';
                logger.debug('点击外部区域关闭微信二维码模态框');
            }
        });
    }
}
    
/**
 * 初始化聊天窗口组件的事件监听器
 */
function initChatWidgetEvents() {
    const chatToggle = document.getElementById('chat-toggle') || document.querySelector('.chat-toggle');
    const chatContainer = document.querySelector('.chat-container');
    const minimizeBtn = document.getElementById('minimize-btn') || document.querySelector('.minimize-btn');
    const closeBtn = document.getElementById('close-btn') || document.querySelector('.chat-close-btn');
    
    if (!chatToggle) {
        logger.warn('⚠️ 未找到聊天切换按钮元素');
    }
    
    if (!chatContainer) {
        logger.warn('⚠️ 未找到聊天容器元素');
    }
    
    if (!minimizeBtn) {
        logger.warn('⚠️ 未找到最小化按钮元素');
    }
    
    if (!closeBtn) {
        logger.warn('⚠️ 未找到关闭按钮元素');
    }
    
    if (chatToggle && chatContainer && minimizeBtn && closeBtn) {
        logger.debug('✅ 聊天组件事件初始化完成');
        
        chatToggle.addEventListener('click', () => {
            logger.debug('👆 聊天图标被点击');
            chatContainer.style.display = 'flex';
            chatToggle.style.display = 'none';
        });
        
        minimizeBtn.addEventListener('click', () => {
            logger.debug('👆 最小化按钮被点击');
            chatContainer.style.display = 'none';
            chatToggle.style.display = 'block';
        });
        
        closeBtn.addEventListener('click', () => {
            logger.debug('👆 关闭按钮被点击');
            const chatWidget = document.getElementById('chat-widget') || document.querySelector('.chat-widget');
            if (chatWidget) {
                chatWidget.style.display = 'none';
            }
        });
    } else {
        logger.warn('⚠️ 聊天组件事件初始化失败，找不到必要的DOM元素');
    }
}