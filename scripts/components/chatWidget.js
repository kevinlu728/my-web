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
 * 
 * 组件内部包含两个主要函数：
 * - sendMessage: 处理消息发送逻辑
 * - addMessage: 将消息添加到聊天界面
 * 
 * 通过initChatWidget函数暴露功能，可被主入口文件调用。
 */

export function initChatWidget() {
    const chatWidget = document.getElementById('chat-widget');
    const chatToggle = document.getElementById('chat-toggle');
    const chatContainer = document.querySelector('.chat-container');
    const minimizeBtn = document.getElementById('minimize-btn');
    const chatCloseBtn = document.getElementById('close-btn');
    const chatInput = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');

    if (!chatWidget || !chatToggle || !minimizeBtn || !chatCloseBtn || !chatContainer) {
        return;
    }

    // 打开/关闭聊天窗口
    chatToggle.addEventListener('click', () => {
        chatContainer.style.display = 'block';
        chatToggle.style.display = 'none';

        // 添加欢迎消息
        const welcomeMessages = [
            '你好！我是Kevin的AI助手，很高兴为你服务 👋',
            '我可以帮您：\n1. 了解Kevin的经历\n2. 查看项目介绍\n3. 获取联系方式\n请问您想了解什么？ 😊'
        ];

        // 依次显示欢迎消息
        welcomeMessages.forEach((msg, index) => {
            setTimeout(() => {
                addMessage(msg, 'ai');
            }, 1000 * (index + 1));
        });
    });

    // 最小化聊天窗口
    minimizeBtn.addEventListener('click', () => {
        chatContainer.style.display = 'none';
        chatToggle.style.display = 'block';
    });

    // 关闭聊天窗口
    chatCloseBtn.addEventListener('click', () => {
        chatWidget.style.display = 'none';
    });

    // 发送消息
    function sendMessage() {
        const message = chatInput.value.trim();
        if (message) {
            // 添加用户消息
            addMessage(message, 'user');
            chatInput.value = '';
            
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
        messageDiv.className = `message ${type}-message`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${text.replace(/\n/g, '<br>')}</p>
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
}

export default { initChatWidget }; 