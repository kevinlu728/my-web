/**
 * @file componentManager.js
 * @description 统一的组件管理器，负责加载和初始化所有类型的组件
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该文件作为网站的组件管理中心，统一管理两类组件：
 * 1. JavaScript功能组件：如导航、粒子背景、弹窗和聊天功能等
 * 2. HTML UI组件：如社交链接、联系模态框、聊天窗口等HTML片段
 * 
 * 通过统一的接口管理所有组件，简化了组件的加载和初始化流程，
 * 并提供了清晰的组件依赖关系和执行顺序。
 */

// 导入JavaScript功能组件
import { initNavigation } from '../components/navigation.js';
import { initParticleBackground } from '../components/particleBackground.js';
import { initContactModals } from '../components/contactModals.js';
import { initChatWidget } from '../components/chatWidget.js';
import { initScrollbar } from '../components/scrollbar.js';
import logger from '../utils/logger.js';

/**
 * 组件管理器类
 * 负责管理和初始化网站的所有组件
 */
class ComponentManager {
    /**
     * 初始化JavaScript功能组件
     * 这些组件提供网站的交互功能
     */
    static initJsComponents() {
        logger.debug('初始化JavaScript功能组件...');
        
        try {
            // 初始化滚动条
            initScrollbar();
            logger.info('✅ 滚动条已初始化');
        } catch (error) {
            logger.error('❌ 滚动条初始化失败:', error);
        }
        
        try {
            // 初始化导航菜单
            initNavigation();
            // logger.info('✅ 导航菜单已初始化');
        } catch (error) {
            logger.error('❌ 导航菜单初始化失败:', error);
        }
        
        try {
            // 初始化粒子背景
            initParticleBackground();
            // 删除重复日志，已在组件内部输出
            // logger.info('✅ 粒子背景已初始化');
        } catch (error) {
            logger.error('❌ 粒子背景初始化失败:', error);
        }
        
        try {
            // 初始化联系方式弹窗
            initContactModals();
            // logger.info('✅ 联系方式弹窗已初始化');
        } catch (error) {
            logger.error('❌ 联系方式弹窗初始化失败:', error);
        }
        
        try {
            // 初始化聊天组件
            initChatWidget();
            // logger.info('✅ 聊天组件已初始化');
        } catch (error) {
            logger.error('❌ 聊天组件初始化失败:', error);
        }
        
        logger.debug('所有JavaScript功能组件初始化已完成');
    }
    
    /**
     * 加载单个HTML UI组件
     * @param {string} containerId - 组件容器的ID
     * @param {string} componentPath - 组件HTML文件的路径
     * @returns {Promise<void>}
     */
    static async loadHtmlComponent(containerId, componentPath) {
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
     * 加载所有HTML UI组件
     * 这些组件是网站UI的一部分，通过HTML片段加载
     * @returns {Promise<void>}
     */
    static async loadHtmlComponents() {
        logger.debug('加载HTML UI组件...');
        
        // 加载所有组件
        const results = await Promise.allSettled([
            this.loadHtmlComponent('social-links-container', './components/social-links.html'),
            this.loadHtmlComponent('contact-modal-container', './components/contact-modal.html'),
            this.loadHtmlComponent('chat-widget-container', './components/chat-widget.html')
        ]);
        
        // 检查结果
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
            logger.warn(`⚠️ ${failed}个HTML组件加载失败`);
        }
        
        logger.debug(`HTML UI组件加载完成 (成功: ${results.length - failed}, 失败: ${failed})`);
    }
    
    /**
     * 为加载的HTML组件初始化事件监听器
     */
    static initializeHtmlComponentEvents() {
        logger.debug('初始化HTML组件事件监听器...');
        
        try {
            // 初始化社交链接组件事件
            this.initSocialLinksEvents();
            // logger.info('✅ 社交链接组件事件已初始化');
        } catch (error) {
            logger.error('❌ 社交链接组件事件初始化失败:', error);
        }
        
        try {
            // 初始化联系模态框组件事件
            this.initContactModalEvents();
            // logger.info('✅ 联系模态框组件事件已初始化');
        } catch (error) {
            logger.error('❌ 联系模态框组件事件初始化失败:', error);
        }
        
        try {
            // 初始化聊天窗口组件事件
            this.initChatWidgetEvents();
            // logger.info('✅ 聊天窗口组件事件已初始化');
        } catch (error) {
            logger.error('❌ 聊天窗口组件事件初始化失败:', error);
        }
        
        // logger.info('✅ 所有HTML组件事件监听器初始化已完成（可能有部分失败）');
    }
    
    /**
     * 初始化社交链接组件的事件监听器
     */
    static initSocialLinksEvents() {
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
    static initContactModalEvents() {
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
    static initChatWidgetEvents() {
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
            logger.debug('✅ 聊天组件事件初始化成功');
            
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
    
    /**
     * 统一初始化所有组件
     * 按照正确的顺序加载和初始化所有组件
     * @returns {Promise<void>}
     */
    static async initialize() {
        logger.debug('🚀 开始初始化所有组件...');
        
        // 第一步：加载HTML UI组件
        await this.loadHtmlComponents();
        
        // 第二步：初始化JavaScript功能组件
        this.initJsComponents();
        
        // 第三步：为HTML组件初始化事件监听器
        this.initializeHtmlComponentEvents();
        
        logger.debug('🎉 所有组件初始化完成！');
    }
}

// 当DOM加载完成后初始化所有组件
document.addEventListener('DOMContentLoaded', () => {
    ComponentManager.initialize().catch(error => {
        logger.error('❌ 组件初始化失败:', error);
    });
});

export default ComponentManager; 