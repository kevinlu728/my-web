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

export function initContactModals() {
    // 初始化微信二维码弹窗
    initWechatModal();
    
    // 初始化联系方式弹窗
    initContactModal();
}

// 微信二维码弹窗
function initWechatModal() {
    const wechatLink = document.getElementById('wechat-link');
    const wechatModal = document.getElementById('wechat-modal');
    
    if (wechatLink && wechatModal) {
        wechatLink.addEventListener('click', () => {
            wechatModal.style.display = 'flex';
        });

        wechatModal.addEventListener('click', (e) => {
            if (e.target === wechatModal) {
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
    }
}

export default { initContactModals };