document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // 点击菜单项后关闭菜单
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });
    });

    // 初始化粒子效果
    const particlesContainer = document.getElementById('particles-js');
    if (particlesContainer) {
        particlesJS("particles-js", {
            particles: {
                number: { 
                    value: 120,
                    density: { 
                        enable: true, 
                        value_area: 800 
                    } 
                },
                color: { value: "#3498db" },
                shape: { type: "circle" },
                opacity: { 
                    value: 0.6,
                    random: false 
                },
                size: { 
                    value: 4,
                    random: true 
                },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: "#3498db",
                    opacity: 0.3,
                    width: 1
                },
                move: { 
                    enable: true, 
                    speed: 2,
                    direction: "none",
                    random: true,
                    straight: false,
                    out_mode: "bounce"
                },
            },
            interactivity: {
                detect_on: "canvas",
                events: { 
                    onhover: { 
                        enable: true, 
                        mode: "grab" 
                    },
                    onclick: {
                        enable: true,
                        mode: "push"
                    },
                    resize: true
                },
                modes: {
                    grab: {
                        distance: 140,
                        line_linked: {
                            opacity: 0.6
                        }
                    }
                }
            },
            retina_detect: true
        });
    }

    // 微信二维码弹窗
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

    // 联系方式弹窗
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

    // 聊天界面
    const chatWidget = document.getElementById('chat-widget');
    const chatToggle = document.getElementById('chat-toggle');
    const chatContainer = document.querySelector('.chat-container');
    const minimizeBtn = document.getElementById('minimize-btn');
    const chatCloseBtn = document.getElementById('close-btn');
    const chatInput = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');

    if (chatWidget && chatToggle && minimizeBtn && chatCloseBtn && chatContainer) {
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

        // 在现有代码中添加
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
}); 