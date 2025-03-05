// 组件加载器
class ComponentLoader {
    static async loadComponent(containerId, componentPath) {
        try {
            const response = await fetch(componentPath);
            if (!response.ok) {
                throw new Error(`Failed to load component from ${componentPath}`);
            }
            const html = await response.text();
            document.getElementById(containerId).innerHTML = html;
        } catch (error) {
            console.error(`Error loading component: ${error}`, componentPath);
        }
    }

    static async initializeComponents() {
        console.log('Initializing components...');
        // 加载所有组件
        await Promise.all([
            this.loadComponent('social-links-container', './components/social-links.html'),
            this.loadComponent('contact-modal-container', './components/contact-modal.html'),
            this.loadComponent('chat-widget-container', './components/chat-widget.html')
        ]);

        console.log('Components loaded, initializing event listeners...');
        // 初始化组件的事件监听器
        this.initializeEventListeners();
    }

    static initializeEventListeners() {
        // 联系按钮点击事件
        const contactBtn = document.querySelector('.contact-btn');
        const contactModal = document.getElementById('contact-modal');
        const contactCloseBtn = contactModal?.querySelector('.close-btn');

        if (contactBtn && contactModal) {
            contactBtn.addEventListener('click', () => {
                contactModal.style.display = 'flex';
            });
        }

        if (contactCloseBtn && contactModal) {
            contactCloseBtn.addEventListener('click', () => {
                contactModal.style.display = 'none';
            });
        }

        // 微信链接点击事件
        const wechatLink = document.getElementById('wechat-link');
        const wechatModal = document.getElementById('wechat-modal');

        if (wechatLink && wechatModal) {
            wechatLink.addEventListener('click', (e) => {
                e.preventDefault();
                wechatModal.style.display = 'flex';
            });

            wechatModal.addEventListener('click', () => {
                wechatModal.style.display = 'none';
            });
        }

        // 聊天组件事件
        const chatWidget = document.querySelector('.chat-widget');
        const chatToggle = document.querySelector('.chat-toggle');
        const minimizeBtn = document.querySelector('.minimize-btn');
        const chatCloseBtn = document.querySelector('.chat-close-btn');

        console.log('Chat elements:', { chatWidget, chatToggle, minimizeBtn, chatCloseBtn });

        if (chatToggle && chatWidget) {
            chatToggle.addEventListener('click', () => {
                console.log('Toggle clicked');
                chatWidget.classList.toggle('active');
            });
        }

        if (minimizeBtn && chatWidget) {
            minimizeBtn.addEventListener('click', () => {
                console.log('Minimize clicked');
                chatWidget.classList.remove('active');
            });
        }

        if (chatCloseBtn && chatWidget) {
            chatCloseBtn.addEventListener('click', () => {
                console.log('Close clicked');
                chatWidget.classList.remove('active');
            });
        }
    }
}

// 当 DOM 加载完成后初始化组件
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting component initialization...');
    ComponentLoader.initializeComponents().catch(error => {
        console.error('Failed to initialize components:', error);
    });
}); 