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
        console.log('初始化JavaScript功能组件...');
        
        // 初始化导航菜单
        initNavigation();
        console.log('导航菜单已初始化');
        
        // 初始化粒子背景
        initParticleBackground();
        console.log('粒子背景已初始化');
        
        // 初始化联系方式弹窗
        initContactModals();
        console.log('联系方式弹窗已初始化');
        
        // 初始化聊天组件
        initChatWidget();
        console.log('聊天组件已初始化');
        
        console.log('所有JavaScript功能组件初始化完成');
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
                console.warn(`容器 ${containerId} 不存在，跳过加载组件`);
                return;
            }
            
            console.log(`加载HTML组件: ${componentPath} 到 ${containerId}`);
            const response = await fetch(componentPath);
            if (!response.ok) {
                throw new Error(`Failed to load component from ${componentPath}`);
            }
            const html = await response.text();
            container.innerHTML = html;
        } catch (error) {
            console.error(`Error loading component: ${error}`, componentPath);
        }
    }
    
    /**
     * 加载所有HTML UI组件
     * 这些组件是网站UI的一部分，通过HTML片段加载
     * @returns {Promise<void>}
     */
    static async loadHtmlComponents() {
        console.log('加载HTML UI组件...');
        
        // 加载所有组件
        await Promise.all([
            this.loadHtmlComponent('social-links-container', './components/social-links.html'),
            this.loadHtmlComponent('contact-modal-container', './components/contact-modal.html'),
            this.loadHtmlComponent('chat-widget-container', './components/chat-widget.html')
        ]);
        
        console.log('所有HTML UI组件加载完成');
    }
    
    /**
     * 为加载的HTML组件初始化事件监听器
     */
    static initializeHtmlComponentEvents() {
        console.log('初始化HTML组件事件监听器...');
        
        // 初始化社交链接组件事件
        this.initSocialLinksEvents();
        
        // 初始化联系模态框组件事件
        this.initContactModalEvents();
        
        // 初始化聊天窗口组件事件
        this.initChatWidgetEvents();
        
        console.log('所有HTML组件事件监听器初始化完成');
    }
    
    /**
     * 初始化社交链接组件的事件监听器
     */
    static initSocialLinksEvents() {
        const socialLinks = document.querySelectorAll('.social-link');
        socialLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const platform = link.getAttribute('data-platform');
                console.log(`点击了社交链接: ${platform}`);
                // 可以添加分析跟踪或其他功能
            });
        });
    }
    
    /**
     * 初始化联系模态框组件的事件监听器
     */
    static initContactModalEvents() {
        const wechatLink = document.getElementById('wechat-link');
        const wechatModal = document.getElementById('wechat-modal');
        const contactCloseBtn = document.querySelector('.contact-modal .close-btn');
        
        if (wechatLink && wechatModal) {
            wechatLink.addEventListener('click', () => {
                wechatModal.style.display = 'flex';
            });
            
            if (contactCloseBtn) {
                contactCloseBtn.addEventListener('click', () => {
                    wechatModal.style.display = 'none';
                });
            }
            
            wechatModal.addEventListener('click', (e) => {
                if (e.target === wechatModal) {
                    wechatModal.style.display = 'none';
                }
            });
        }
    }
    
    /**
     * 初始化聊天窗口组件的事件监听器
     */
    static initChatWidgetEvents() {
        const chatToggle = document.getElementById('chat-toggle');
        const chatContainer = document.querySelector('.chat-container');
        const minimizeBtn = document.getElementById('minimize-btn');
        const closeBtn = document.getElementById('close-btn');
        
        if (chatToggle && chatContainer && minimizeBtn && closeBtn) {
            chatToggle.addEventListener('click', () => {
                chatContainer.style.display = 'block';
                chatToggle.style.display = 'none';
            });
            
            minimizeBtn.addEventListener('click', () => {
                chatContainer.style.display = 'none';
                chatToggle.style.display = 'block';
            });
            
            closeBtn.addEventListener('click', () => {
                const chatWidget = document.getElementById('chat-widget-container');
                if (chatWidget) {
                    chatWidget.style.display = 'none';
                }
            });
        }
    }
    
    /**
     * 统一初始化所有组件
     * 按照正确的顺序加载和初始化所有组件
     * @returns {Promise<void>}
     */
    static async initialize() {
        console.log('开始初始化所有组件...');
        
        // 第一步：初始化JavaScript功能组件
        this.initJsComponents();
        
        // 第二步：加载HTML UI组件
        await this.loadHtmlComponents();
        
        // 第三步：为HTML组件初始化事件监听器
        this.initializeHtmlComponentEvents();
        
        console.log('所有组件初始化完成！');
    }
}

// 当DOM加载完成后初始化所有组件
document.addEventListener('DOMContentLoaded', () => {
    ComponentManager.initialize().catch(error => {
        console.error('组件初始化失败:', error);
    });
});

// 导出组件管理器，以便其他模块可以使用
export default ComponentManager; 