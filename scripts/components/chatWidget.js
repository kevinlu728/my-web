/**
 * @file chatWidget.js
 * @description 聊天组件，处理网站右下角聊天窗口的交互逻辑
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该组件实现了网站右下角的聊天窗口功能，包括：
 * - 聊天窗口的打开/关闭/最小化
 * - 消息的发送和接收
 * - 欢迎消息的自动显示
 * - 快捷回复按钮功能
 * - 输入框的自动调整高度
 * - 聊天窗口大小的调整
 * 
 * 组件内部包含两个主要函数：
 * - sendMessage: 处理消息发送逻辑
 * - addMessage: 将消息添加到聊天界面
 * 
 * 通过initChatWidget函数暴露功能，可被主入口文件调用。
 */

import logger from '../utils/logger.js';

export function initChatWidget() {
    // 尝试通过ID选择器获取元素，如果失败则尝试类选择器
    const chatWidget = document.getElementById('chat-widget') || document.querySelector('.chat-widget');
    const chatToggle = document.getElementById('chat-toggle') || document.querySelector('.chat-toggle');
    const chatContainer = document.querySelector('.chat-container');
    const minimizeBtn = document.getElementById('minimize-btn') || document.querySelector('.minimize-btn');
    const chatCloseBtn = document.getElementById('close-btn') || document.querySelector('.chat-close-btn');
    const chatInput = document.getElementById('chat-input-field') || document.querySelector('.chat-input-field');
    const sendBtn = document.getElementById('send-btn') || document.querySelector('.send-btn');
    const chatMessages = document.getElementById('chat-messages') || document.querySelector('.chat-messages');
    const resizeHandle = document.getElementById('resize-handle') || document.querySelector('.resize-handle');
    const chatHeader = document.querySelector('.chat-header');

    if (!chatWidget || !chatToggle || !minimizeBtn || !chatCloseBtn || !chatContainer) {
        logger.warn('聊天组件初始化失败：找不到必要的DOM元素');
        logger.info('缺失元素：', {
            chatWidget: !!chatWidget,
            chatToggle: !!chatToggle,
            chatContainer: !!chatContainer,
            minimizeBtn: !!minimizeBtn,
            chatCloseBtn: !!chatCloseBtn
        });
        return;
    }

    logger.info('聊天组件初始化成功');

    // 清空聊天记录，确保没有重复消息
    chatMessages.innerHTML = '';
    
    // 初始是否已经显示了欢迎消息
    let welcomeShown = false;
    
    // 打开/关闭聊天窗口
    chatToggle.addEventListener('click', () => {
        logger.info('聊天图标被点击');
        chatContainer.style.display = 'flex';  // 改为flex布局
        chatToggle.style.display = 'none';

        // 只有在第一次打开时才显示欢迎消息
        if (!welcomeShown) {
            welcomeShown = true;
            // 添加欢迎消息
            const welcomeMessages = [
                '你好！我是Kevin的AI小助手，很高兴为你服务 👋',
                '我可以帮您：\n1. 了解Kevin的经历\n2. 查看项目介绍\n3. 获取联系方式\n请问您想了解什么？ 😊'
            ];

            // 依次显示欢迎消息
            welcomeMessages.forEach((msg, index) => {
                setTimeout(() => {
                    addMessage(msg, 'ai');
                }, 1000 * (index + 1));
            });
        }
    });

    // 最小化聊天窗口
    minimizeBtn.addEventListener('click', () => {
        logger.info('最小化按钮被点击');
        chatContainer.style.display = 'none';
        chatToggle.style.display = 'block';
    });

    // 关闭聊天窗口
    chatCloseBtn.addEventListener('click', () => {
        logger.info('关闭按钮被点击');
        chatWidget.style.display = 'none';
    });

    // 调整聊天窗口大小
    if (resizeHandle) {
        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        // 开始调整大小
        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isResizing = true;
            
            // 记录起始位置和尺寸
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(document.defaultView.getComputedStyle(chatContainer).width, 10);
            startHeight = parseInt(document.defaultView.getComputedStyle(chatContainer).height, 10);
            
            // 添加调整大小的类，改变鼠标样式
            document.body.classList.add('resizing');
            chatContainer.classList.add('resizing');
            
            // 监听鼠标移动和松开事件
            document.addEventListener('mousemove', onResize);
            document.addEventListener('mouseup', stopResize);
            
            logger.info('开始调整聊天窗口大小');
        });

        // 调整大小过程
        function onResize(e) {
            if (!isResizing) return;

            // 计算新的宽度和高度
            const newWidth = startWidth + (e.clientX - startX);
            const newHeight = startHeight + (e.clientY - startY);

            // 限制最小和最大尺寸
            const minWidth = 280;
            const minHeight = 400;
            const maxWidth = window.innerWidth * 0.8;
            const maxHeight = window.innerHeight * 0.8;

            // 应用新尺寸
            chatContainer.style.width = `${Math.min(Math.max(newWidth, minWidth), maxWidth)}px`;
            chatContainer.style.height = `${Math.min(Math.max(newHeight, minHeight), maxHeight)}px`;
        }

        // 停止调整大小
        function stopResize() {
            isResizing = false;
            document.body.classList.remove('resizing');
            chatContainer.classList.remove('resizing');
            
            // 移除事件监听
            document.removeEventListener('mousemove', onResize);
            document.removeEventListener('mouseup', stopResize);
            
            logger.info('完成聊天窗口大小调整');
        }
    }

    // 允许拖动聊天窗口
    if (chatHeader) {
        let isDragging = false;
        let offsetX, offsetY;

        // 开始拖动
        chatHeader.addEventListener('mousedown', (e) => {
            // 如果点击的是控制按钮，不开始拖动
            if (e.target.closest('.chat-controls')) return;
            
            e.preventDefault();
            isDragging = true;
            
            // 计算鼠标在窗口内的偏移
            const rect = chatContainer.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            // 添加拖动样式
            chatHeader.style.cursor = 'grabbing';
            
            // 监听鼠标移动和松开事件
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
            
            logger.info('开始拖动聊天窗口');
        });

        // 拖动过程
        function onDrag(e) {
            if (!isDragging) return;

            // 计算新的位置
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;

            // 限制不超出屏幕
            const maxX = window.innerWidth - chatContainer.offsetWidth;
            const maxY = window.innerHeight - chatContainer.offsetHeight;

            // 应用新位置
            chatContainer.style.right = 'auto';
            chatContainer.style.bottom = 'auto';
            chatContainer.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
            chatContainer.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
        }

        // 停止拖动
        function stopDrag() {
            isDragging = false;
            chatHeader.style.cursor = 'move';
            
            // 移除事件监听
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', stopDrag);
            
            logger.info('完成聊天窗口拖动');
        }
    }

    // 发送消息
    function sendMessage() {
        const message = chatInput.value.trim();
        if (message) {
            // 添加用户消息
            addMessage(message, 'user');
            chatInput.value = '';
            chatInput.style.height = 'auto';
            
            // 模拟AI回复
            setTimeout(() => {
                addMessage('这是一个模拟的AI回复 😊', 'ai');
            }, 1000);
        }
    }

    // 添加消息到聊天框
    function addMessage(text, type) {
        const time = new Date().toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type === 'user' ? 'user-message' : 'bot-message'}`;
        
        // 处理文本，确保HTML安全和正确换行
        const safeText = String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${safeText}</p>
            </div>
            <div class="message-time">${time}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 发送按钮点击事件
    sendBtn.addEventListener('click', sendMessage);

    // 输入框回车发送
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 自动调整输入框高度
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = chatInput.scrollHeight + 'px';
    });

    // 快捷回复按钮
    const quickReplyBtns = document.querySelectorAll('.quick-reply-btn');
    quickReplyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const message = btn.textContent;
            addMessage(message, 'user');
            
            // 根据不同的快捷回复给出不同的AI回应
            setTimeout(() => {
                let aiResponse;
                switch (message) {
                    case '了解更多':
                        aiResponse = '我可以为您介绍Kevin的职业经历、技术专长和个人兴趣。您想了解哪个方面呢？ 😊';
                        break;
                    case '查看项目':
                        aiResponse = '好的，我可以为您介绍Kevin参与过的一些重要项目，包括华为HiAI、京东端智能和美团终端PaaS等。您对哪个项目感兴趣？ 🚀';
                        break;
                    case '联系方式':
                        aiResponse = '您可以通过以下方式联系Kevin：\n1. 微信\n2. 邮箱：kevinlu728@gmail.com\n3. LinkedIn主页\n需要我为您展示具体的联系方式吗？ 📱';
                        break;
                    default:
                        aiResponse = '抱歉，我没有理解您的问题。请您换个方式提问，或者选择快捷回复按钮。 🤔';
                }
                addMessage(aiResponse, 'ai');
            }, 1000);
        });
    });

    // 保存窗口大小和位置
    function saveWindowState() {
        const state = {
            width: chatContainer.style.width,
            height: chatContainer.style.height,
            left: chatContainer.style.left,
            top: chatContainer.style.top
        };
        
        try {
            localStorage.setItem('chatWidgetState', JSON.stringify(state));
        } catch (e) {
            logger.warn('无法保存聊天窗口状态:', e);
        }
    }

    // 恢复窗口大小和位置
    function restoreWindowState() {
        try {
            const stateStr = localStorage.getItem('chatWidgetState');
            if (stateStr) {
                const state = JSON.parse(stateStr);
                
                // 只有存在有效值才应用
                if (state.width) chatContainer.style.width = state.width;
                if (state.height) chatContainer.style.height = state.height;
                if (state.left) {
                    chatContainer.style.left = state.left;
                    chatContainer.style.right = 'auto';
                }
                if (state.top) {
                    chatContainer.style.top = state.top;
                    chatContainer.style.bottom = 'auto';
                }
            }
        } catch (e) {
            logger.warn('无法恢复聊天窗口状态:', e);
        }
    }
    
    // 在窗口关闭前保存状态
    window.addEventListener('beforeunload', saveWindowState);
    
    // 初始化时恢复窗口状态
    restoreWindowState();
}

export default { initChatWidget }; 