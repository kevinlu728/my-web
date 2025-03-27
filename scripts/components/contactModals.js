/**
 * @file contactModals.js
 * @description 联系方式弹窗组件，处理微信二维码和联系方式弹窗的交互逻辑
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该组件负责管理网站中的联系方式相关弹窗，包括：
 * - 微信二维码弹窗的显示/隐藏
 * - 联系方式弹窗的显示/隐藏
 * - 弹窗的点击外部关闭功能
 * 
 * 组件内部包含两个子函数：
 * - initWechatModal: 初始化微信二维码弹窗
 * - initContactModal: 初始化联系方式弹窗
 * 
 * 通过initContactModals函数暴露功能，可被主入口文件调用。
 */

import logger from '../utils/logger.js';

export function initContactModals() {
    // 初始化微信二维码弹窗
    initWechatModal();
    
    // 初始化联系方式弹窗
    initContactModal();
    
    // 绑定首页联系按钮（确保所有页面中的联系按钮都能正确绑定）
    bindContactButtons();
}

// 确保所有联系按钮都能正确绑定点击事件
function bindContactButtons() {
    // 延迟执行以确保DOM已完全加载
    setTimeout(() => {
        const contactBtns = document.querySelectorAll('.contact-btn');
        const contactModal = document.getElementById('contact-modal');
        
        if (contactBtns.length > 0 && contactModal) {
            contactBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    logger.info('联系按钮被点击');
                    contactModal.style.display = 'flex';
                });
            });
            logger.info(`已成功绑定 ${contactBtns.length} 个联系按钮`);
        } else {
            logger.warn('未找到联系按钮或联系模态框，请检查HTML结构');
        }
    }, 500);
}

// 微信二维码弹窗
function initWechatModal() {
    const wechatLink = document.getElementById('wechat-link');
    const wechatModal = document.getElementById('wechat-modal');
    
    if (wechatLink && wechatModal) {
        // 获取关闭按钮
        const closeBtn = wechatModal.querySelector('.close-btn');
        
        wechatLink.addEventListener('click', () => {
            logger.info('微信链接被点击');
            wechatModal.style.display = 'flex';
        });

        // 点击关闭按钮关闭弹窗
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                logger.info('微信弹窗关闭按钮被点击');
                wechatModal.style.display = 'none';
            });
        }

        // 点击弹窗背景关闭
        wechatModal.addEventListener('click', (e) => {
            if (e.target === wechatModal) {
                wechatModal.style.display = 'none';
            }
        });
        
        // 添加ESC键关闭功能
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && wechatModal.style.display === 'flex') {
                wechatModal.style.display = 'none';
            }
        });
    }
}

// 联系方式弹窗
function initContactModal() {
    const contactBtn = document.querySelector('.contact-btn');
    const contactModal = document.getElementById('contact-modal');
    let contactCloseBtn = null;
    
    if (contactModal) {
        contactCloseBtn = contactModal.querySelector('.close-btn');
    }

    if (contactBtn && contactModal && contactCloseBtn) {
        contactBtn.addEventListener('click', () => {
            contactModal.style.display = 'flex';
        });

        contactCloseBtn.addEventListener('click', () => {
            contactModal.style.display = 'none';
        });

        contactModal.addEventListener('click', (e) => {
            if (e.target === contactModal) {
                contactModal.style.display = 'none';
            }
        });
        
        // 添加ESC键关闭功能
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && contactModal.style.display === 'flex') {
                contactModal.style.display = 'none';
            }
        });
    }
}

export default { initContactModals };